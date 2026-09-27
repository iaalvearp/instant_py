// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // Workaround para WebKitGTK en Linux: pantalla en blanco (DMABUF/compositing).
    // Debe ejecutarse antes de que se cree la ventana, por eso va aquí y no en
    // variables de la terminal.
    // https://tauri.app/es/develop/debug/linux-graphics/
    #[cfg(target_os = "linux")]
    {
        std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
        std::env::set_var("WEBKIT_DISABLE_COMPOSITING_MODE", "1");
    }

    instant_py_lib::run()
}
