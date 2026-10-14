package net.saibatudo.quimica.data.remote

import okhttp3.OkHttpClient
import java.util.concurrent.TimeUnit

/**
 * Cliente HTTP único do app. A rede serve para baixar a atualização assinada do pacote de dados e, SÓ com consentimento
 * (botão "Perguntar à IA na nuvem" ou a opção automática), para enviar o texto de uma pergunta ao NLU na nuvem (CloudNluClient,
 * que encurta o tempo por pedido). A captura opt-in de perguntas não entendidas (como no app de eleições) fica para depois.
 */
object HttpClientFactory {
    fun criar(versao: String): OkHttpClient =
        OkHttpClient.Builder()
            .connectTimeout(10, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .callTimeout(120, TimeUnit.SECONDS)
            .addInterceptor { chain ->
                chain.proceed(
                    chain.request().newBuilder()
                        .header("User-Agent", "SaibaTudo-Quimica/$versao (Android)")
                        .build()
                )
            }
            .build()
}
