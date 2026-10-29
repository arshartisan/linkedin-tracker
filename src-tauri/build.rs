fn main() {
    // Rebuild when the baked-in URL changes, not just when Rust files do.
    println!("cargo:rerun-if-env-changed=REACH_URL");
    tauri_build::build()
}
