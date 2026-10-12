package net.saibatudo.quimica.domain.calc

import net.saibatudo.quimica.R
import net.saibatudo.quimica.data.model.UnidadeDef
import net.saibatudo.quimica.domain.Textos

/**
 * Nome por extenso das unidades do app no idioma ("quilopascal", "kilopascal", "Kilopascal"), em strings.xml. As unidades vêm do pacote ou de
 * [Unidades.PADRAO]; um símbolo que não está aqui (unidade nova do pacote, ou com prefixo SI) usa o nome que a própria unidade traz.
 * GERADO a partir de Unidades.PADRAO: ao acrescentar uma unidade lá, acrescente o nome em values-<idioma>/strings.xml e a linha aqui.
 */
object UnidadeNomes {
    private val NOMES: Map<String, Int> = mapOf(
        "K" to R.string.unidade_nome_k,
        "°C" to R.string.unidade_nome_celsius,
        "°F" to R.string.unidade_nome_fahrenheit,
        "Pa" to R.string.unidade_nome_pa,
        "kPa" to R.string.unidade_nome_kpa,
        "bar" to R.string.unidade_nome_bar,
        "atm" to R.string.unidade_nome_atm,
        "mmHg" to R.string.unidade_nome_mmhg,
        "psi" to R.string.unidade_nome_psi,
        "m³" to R.string.unidade_nome_m3,
        "L" to R.string.unidade_nome_l,
        "mL" to R.string.unidade_nome_ml,
        "cm³" to R.string.unidade_nome_cm3,
        "dm³" to R.string.unidade_nome_dm3,
        "kg" to R.string.unidade_nome_kg,
        "g" to R.string.unidade_nome_g,
        "mg" to R.string.unidade_nome_mg,
        "t" to R.string.unidade_nome_t,
        "lb" to R.string.unidade_nome_lb,
        "oz" to R.string.unidade_nome_oz,
        "J" to R.string.unidade_nome_j,
        "kJ" to R.string.unidade_nome_kj,
        "cal" to R.string.unidade_nome_cal,
        "kcal" to R.string.unidade_nome_kcal,
        "eV" to R.string.unidade_nome_ev,
        "kWh" to R.string.unidade_nome_kwh,
        "mol" to R.string.unidade_nome_mol,
        "mmol" to R.string.unidade_nome_mmol,
        "mol/L" to R.string.unidade_nome_mol_l,
        "mmol/L" to R.string.unidade_nome_mmol_l,
        "µmol/L" to R.string.unidade_nome_umol_l,
        "kg/m³" to R.string.unidade_nome_kg_m3,
        "g/cm³" to R.string.unidade_nome_g_cm3,
        "m" to R.string.unidade_nome_m,
        "cm" to R.string.unidade_nome_cm,
        "mm" to R.string.unidade_nome_mm,
        "nm" to R.string.unidade_nome_nm,
        "pm" to R.string.unidade_nome_pm,
        "Å" to R.string.unidade_nome_angstrom,
        "in" to R.string.unidade_nome_in,
        "ft" to R.string.unidade_nome_ft,
        "mi" to R.string.unidade_nome_mi,
        "s" to R.string.unidade_nome_s,
        "min" to R.string.unidade_nome_min,
        "h" to R.string.unidade_nome_h,
        "d" to R.string.unidade_nome_d
    )

    /** Nome da unidade no idioma de [t]; sem nome em strings.xml, o `nome` da própria unidade (do pacote); null se não houver. */
    fun nome(u: UnidadeDef, t: Textos): String? = NOMES[u.simbolo]?.let { t(it) } ?: u.nome?.takeIf { it.isNotBlank() }
}
