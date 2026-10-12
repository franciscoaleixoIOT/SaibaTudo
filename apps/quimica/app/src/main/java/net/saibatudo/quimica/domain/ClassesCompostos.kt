package net.saibatudo.quimica.domain

import net.saibatudo.quimica.R

/**
 * Nome das classes de composto ("ácido", "composto iônico"…) no idioma, em strings.xml (`classe_<id>`). O id é o do pacote (`compostos[].classes`);
 * uma classe fora da lista sai com o próprio id, sem sublinhados. GERADO a partir de GhsTextos.CLASSES_PT (as mesmas classes).
 */
object ClassesCompostos {
    private val NOMES: Map<String, Int> = mapOf(
        "acido" to R.string.classe_acido,
        "acido_carboxilico" to R.string.classe_acido_carboxilico,
        "base" to R.string.classe_base,
        "sal" to R.string.classe_sal,
        "oxido" to R.string.classe_oxido,
        "hidroxido" to R.string.classe_hidroxido,
        "peroxido" to R.string.classe_peroxido,
        "oxidante" to R.string.classe_oxidante,
        "inorganico" to R.string.classe_inorganico,
        "organico" to R.string.classe_organico,
        "alcool" to R.string.classe_alcool,
        "fenol" to R.string.classe_fenol,
        "aldeido" to R.string.classe_aldeido,
        "cetona" to R.string.classe_cetona,
        "eter" to R.string.classe_eter,
        "ester" to R.string.classe_ester,
        "amina" to R.string.classe_amina,
        "amida" to R.string.classe_amida,
        "alcano" to R.string.classe_alcano,
        "alqueno" to R.string.classe_alqueno,
        "alquino" to R.string.classe_alquino,
        "hidrocarboneto" to R.string.classe_hidrocarboneto,
        "aromatico" to R.string.classe_aromatico,
        "heterociclico" to R.string.classe_heterociclico,
        "halogenado" to R.string.classe_halogenado,
        "carboidrato" to R.string.classe_carboidrato,
        "aminoacido" to R.string.classe_aminoacido,
        "lipidio" to R.string.classe_lipidio,
        "proteina" to R.string.classe_proteina,
        "vitamina" to R.string.classe_vitamina,
        "farmaco" to R.string.classe_farmaco,
        "solvente" to R.string.classe_solvente,
        "polimero" to R.string.classe_polimero,
        "gas" to R.string.classe_gas,
        "metal" to R.string.classe_metal,
        "nitrocomposto" to R.string.classe_nitrocomposto,
        "nitrila" to R.string.classe_nitrila,
        "tiol" to R.string.classe_tiol,
        "sulfonato" to R.string.classe_sulfonato,
        "organometalico" to R.string.classe_organometalico,
        "ionico" to R.string.classe_ionico,
        "molecular" to R.string.classe_molecular,
        "esteroide" to R.string.classe_esteroide,
        "alcaloide" to R.string.classe_alcaloide
    )

    fun nome(id: String, t: Textos): String = NOMES[id]?.let { t(it) } ?: id.replace('_', ' ')
}
