// Generación de slugs a partir de nombres visibles.
// Reglas: minúsculas, sin acentos, espacios a guiones, solo [a-z0-9-].
// Si el slug ya existe, se añade un sufijo numérico (-2, -3...).

use unicode_normalization::UnicodeNormalization;

/// Convierte un nombre visible en un slug básico.
pub fn generar_slug(nombre: &str) -> String {
    let mut slug: Vec<char> = Vec::with_capacity(nombre.len());
    let mut ultimo_guion = false;

    // NFKD separa acentos y diéresis de la letra base. Las marcas combinantes
    // (U+0300...) se descartan: solo producen guion los separadores reales.
    for c in nombre.nfkd().flat_map(char::to_lowercase) {
        let valido = c.is_ascii_lowercase() || c.is_ascii_digit();
        if valido {
            slug.push(c);
            ultimo_guion = false;
        } else if es_marca_combinante(c) {
            continue;
        } else if !ultimo_guion && !slug.is_empty() {
            slug.push('-');
            ultimo_guion = true;
        }
    }

    while slug.last() == Some(&'-') {
        slug.pop();
    }

    let resultado: String = slug.into_iter().collect();
    if resultado.is_empty() {
        "sin-nombre".to_string()
    } else {
        resultado
    }
}

/// Rangos de marcas combinantes (categoría Unicode Mn/Me) que deben ignorarse.
fn es_marca_combinante(c: char) -> bool {
    matches!(
        c as u32,
        0x0300..=0x036f
            | 0x0483..=0x0489
            | 0x1ab0..=0x1aff
            | 0x1dc0..=0x1dff
            | 0x20d0..=0x20ff
            | 0xfe20..=0xfe2f
    )
}

/// Devuelve un slug libre según `existe_disco(slug)`, añadiendo -2, -3...
pub fn slug_unico(base: &str, existe_disco: impl Fn(&str) -> bool) -> String {
    if !existe_disco(base) {
        return base.to_string();
    }
    for n in 2.. {
        let candidato = format!("{base}-{n}");
        if !existe_disco(&candidato) {
            return candidato;
        }
    }
    unreachable!("el bucle de slugs no puede agotarse")
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashSet;

    #[test]
    fn slug_convierte_espacios_y_mayusculas() {
        assert_eq!(generar_slug("Mi Primer Programa"), "mi-primer-programa");
    }

    #[test]
    fn slug_quita_acentos_y_enies() {
        assert_eq!(generar_slug("Café con Ñandú"), "cafe-con-nandu");
    }

    #[test]
    fn slug_elimina_caracteres_no_permitidos() {
        assert_eq!(generar_slug("  Año!! 2024--"), "ano-2024");
    }

    #[test]
    fn slug_vacio_cae_a_fallback() {
        assert_eq!(generar_slug("   ... "), "sin-nombre");
    }

    #[test]
    fn slug_unico_añade_sufijo_numeral() {
        let existentes: HashSet<String> =
            ["demo", "demo-2", "demo-3"].map(String::from).into();
        assert_eq!(slug_unico("demo", |s| existentes.contains(s)), "demo-4");
    }

    #[test]
    fn slug_unico_pasa_sin_cambiar_si_esta_libre() {
        let existentes: HashSet<String> = ["otro"].map(String::from).into();
        assert_eq!(slug_unico("demo", |s| existentes.contains(s)), "demo");
    }
}