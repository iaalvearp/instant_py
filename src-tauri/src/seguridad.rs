// Control de acceso a archivos: toda ruta que llega del frontend es relativa
// al proyecto activo. Antes de tocar el disco se resuelve contra la carpeta
// del proyecto y se comprueba que el resultado quede DENTRO de ella.
// Se rechazan rutas absolutas, escapadas (`..`) y enlaces simbólicos que salgan.

use std::path::{Component, Path, PathBuf};

pub const ERROR_RUTA_FUERA_PROYECTO: &str = "Ruta fuera del proyecto bloqueada";

/// Resuelve `relativa` contra `raiz` garantizando que el resultado queda
/// dentro de `raiz`. Devuelve error claro si la ruta intenta escapar.
pub fn resolver_ruta_en(raiz: &Path, relativa: &str) -> Result<PathBuf, String> {
    if relativa.is_empty() {
        return Err("Ruta vacía no permitida".to_string());
    }

    let ruta = Path::new(relativa);
    // El primer componente "Prefix" detecta unidades Windows ("C:foo") y UNC,
    // que en Rust reemplazarían la raíz al hacer `join` y permitirían escapar.
    let tiene_prefijo_windows = matches!(
        ruta.components().next(),
        Some(Component::Prefix(_))
    );
    let mut caracteres = relativa.chars();
    let es_prefijo_unidad = matches!(
        (caracteres.next(), caracteres.next()),
        (Some(letra), Some(':')) if letra.is_ascii_alphabetic()
    );
    if ruta.is_absolute()
        || tiene_prefijo_windows
        || es_prefijo_unidad
        || relativa.starts_with('/')
        || relativa.starts_with('\\')
        || relativa.contains(":/")
        || relativa.starts_with("\\\\")
    {
        return Err(ERROR_RUTA_FUERA_PROYECTO.to_string());
    }

    let normalizada = relativa.replace('\\', "/");
    let mut objetivo = PathBuf::from(raiz);
    for parte in normalizada.split('/') {
        if parte.is_empty() || parte == "." {
            continue;
        }
        if parte == ".." {
            return Err(ERROR_RUTA_FUERA_PROYECTO.to_string());
        }
        objetivo.push(parte);
    }

    // Verificación final por enlaces simbólicos: si el objetivo (o su padre)
    // existe, debe desembocar dentro de la raíz canónica del proyecto.
    let raiz_canonica = std::fs::canonicalize(raiz)
        .map_err(|e| format!("No se pudo resolver el proyecto en disco: {e}"))?;

    match std::fs::canonicalize(&objetivo) {
        Ok(canonica) => {
            if !canonica.starts_with(&raiz_canonica) {
                return Err(ERROR_RUTA_FUERA_PROYECTO.to_string());
            }
        }
        Err(_) => {
            // Aún no existe: el padre más próximo que exista debe estar dentro.
            let mut ancestro = objetivo.as_path();
            loop {
                if let Ok(canonica) = std::fs::canonicalize(ancestro) {
                    if !canonica.starts_with(&raiz_canonica) {
                        return Err(ERROR_RUTA_FUERA_PROYECTO.to_string());
                    }
                    break;
                }
                match ancestro.parent() {
                    Some(padre) => ancestro = padre,
                    None => break,
                }
            }
        }
    }

    Ok(objetivo)
}

/// Valida que un slug pedido desde el frontend sea un identificador seguro
/// para usarlo como nombre de carpeta (sin separadores ni "..").
pub fn validar_slug_identificador(s: &str) -> bool {
    !s.is_empty()
        && s.len() <= 120
        && s.chars().all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '-')
        && s != "."
        && s != ".."
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    fn proyecto_temporal(nombre_test: &str) -> PathBuf {
        let ruta = std::env::temp_dir().join(format!(
            "instant_py_seguridad_{}_{}",
            std::process::id(),
            nombre_test
        ));
        let _ = fs::remove_dir_all(&ruta);
        fs::create_dir_all(ruta.join("carpeta/anidada")).unwrap();
        fs::write(ruta.join("main.py"), "x").unwrap();
        fs::write(ruta.join("carpeta/anidada/lib.py"), "y").unwrap();
        ruta
    }

    #[test]
    fn acepta_archivo_en_raiz() {
        let raiz = proyecto_temporal("archivo_en_raiz");
        let resultado = resolver_ruta_en(&raiz, "main.py").unwrap();
        assert_eq!(resultado, raiz.join("main.py"));
        let _ = fs::remove_dir_all(&raiz);
    }

    #[test]
    fn acepta_ruta_anidada_con_separador_mixto() {
        let raiz = proyecto_temporal("ruta_anidada");
        let resultado = resolver_ruta_en(&raiz, "carpeta\\anidada/lib.py").unwrap();
        assert_eq!(resultado, raiz.join("carpeta/anidada/lib.py"));
        let _ = fs::remove_dir_all(&raiz);
    }

    #[test]
    fn rechaza_escape_hacia_arriba() {
        let raiz = proyecto_temporal("escape_hacia_arriba");
        for intento in ["../x", "carpeta/../../x", "a/../..", "./../pico"] {
            let error = resolver_ruta_en(&raiz, intento).unwrap_err();
            assert_eq!(error, ERROR_RUTA_FUERA_PROYECTO, "falló para {intento}");
        }
        let _ = fs::remove_dir_all(&raiz);
    }

    #[test]
    fn rechaza_rutas_absolutas() {
        let raiz = proyecto_temporal("absolutas");
        for intento in ["/etc/passwd", "/main.py", "C:\\Windows", ".\\..", "C:foo"] {
            assert!(
                resolver_ruta_en(&raiz, intento).is_err(),
                "falló para {intento}"
            );
        }
        let _ = fs::remove_dir_all(&raiz);
    }

    #[test]
    fn rechaza_ruta_vacia() {
        let raiz = proyecto_temporal("vacia");
        assert!(resolver_ruta_en(&raiz, "").is_err());
        let _ = fs::remove_dir_all(&raiz);
    }

    #[test]
    fn valida_identificadores() {
        assert!(validar_slug_identificador("mi-proyecto"));
        assert!(validar_slug_identificador("a1-b2"));
        assert!(!validar_slug_identificador("Mi-Proyecto"));
        assert!(!validar_slug_identificador("mi/proyecto"));
        assert!(!validar_slug_identificador(".."));
        assert!(!validar_slug_identificador(""));
    }
}