// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            // Enable SPA routing - handle 404s by loading the catch-all page
            let window = app.get_webview_window("main").unwrap();

            // For development, we use the dev URL which handles routing server-side
            // For production with static files, client-side navigation works naturally
            // Deep linking/refresh on dynamic routes will need to start from base URL
            #[cfg(debug_assertions)]
            {
                // In debug mode, window loads from devUrl (http://localhost:3000)
                let _ = window;
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
