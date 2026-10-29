//! Reach as a desktop app: a native window around the hosted web app.
//!
//! Nothing from the Next.js app is bundled. The session cookie, the auth proxy
//! and the API routes all stay on the server, so the desktop app gets every
//! deploy for free and never holds AUTH_SECRET.

// No console window behind the app in release builds.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::menu::MenuBuilder;
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::webview::NewWindowResponse;
use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder, WindowEvent};
use tauri_plugin_opener::OpenerExt;
use url::Url;

/// Baked in at compile time: `REACH_URL=https://… npm run desktop:build`.
/// Falls back to the dev server so `npm run desktop:dev` works with no setup.
const APP_URL: &str = match option_env!("REACH_URL") {
    Some(url) => url,
    None => "http://localhost:3000",
};

const MAIN: &str = "main";

fn main() {
    let app_url = Url::parse(APP_URL).expect("REACH_URL must be an absolute URL");

    tauri::Builder::default()
        // Registered first so a second launch focuses this one instead of
        // opening another window with its own copy of the pipeline.
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            show_main(app);
        }))
        .plugin(tauri_plugin_opener::init())
        .setup(move |app| {
            build_main_window(app.handle(), app_url.clone())?;
            build_tray(app.handle())?;
            Ok(())
        })
        .on_window_event(|window, event| {
            // Closing hides to the tray; Quit in the tray menu really exits.
            if let WindowEvent::CloseRequested { api, .. } = event {
                if window.label() == MAIN {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running Reach");
}

fn build_main_window(app: &AppHandle, app_url: Url) -> tauri::Result<()> {
    let nav_handle = app.clone();
    let nav_origin = app_url.origin();
    let popup_handle = app.clone();

    WebviewWindowBuilder::new(app, MAIN, WebviewUrl::External(app_url))
        .title("Reach")
        .inner_size(1280.0, 820.0)
        .min_inner_size(900.0, 600.0)
        .center()
        // Links that leave the app (LinkedIn, Upwork, mailto:) belong in the
        // user's real browser, where they're signed in to those sites.
        .on_navigation(move |url| {
            if url.origin() == nav_origin {
                return true;
            }
            open_external(&nav_handle, url);
            false
        })
        // window.open(…, "_blank") - e.g. "Open profile" in AddConnect.
        .on_new_window(move |url, _features| {
            open_external(&popup_handle, &url);
            NewWindowResponse::Deny
        })
        .build()?;
    Ok(())
}

fn build_tray(app: &AppHandle) -> tauri::Result<()> {
    let menu = MenuBuilder::new(app)
        .text("show", "Open Reach")
        .separator()
        .text("quit", "Quit")
        .build()?;

    TrayIconBuilder::new()
        .icon(app.default_window_icon().cloned().expect("bundle has an icon"))
        .tooltip("Reach")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id().as_ref() {
            "show" => show_main(app),
            "quit" => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                show_main(tray.app_handle());
            }
        })
        .build(app)?;
    Ok(())
}

fn show_main(app: &AppHandle) {
    if let Some(window) = app.get_webview_window(MAIN) {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }
}

fn open_external(app: &AppHandle, url: &Url) {
    // Only hand the OS schemes it should open; anything else is dropped.
    if matches!(url.scheme(), "http" | "https" | "mailto") {
        let _ = app.opener().open_url(url.as_str(), None::<&str>);
    }
}
