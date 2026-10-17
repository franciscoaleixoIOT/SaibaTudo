# -*- coding: utf-8 -*-
"""
Valida os arquivos de .github/: YAML bem formado e estrutura mínima de cada workflow, e a SINTAXE DE SHELL de cada passo `run` (bash -n).
Motivo: um bloco `run:` com uma linha na coluna 0 quebrou lacunas_nlu.yml (workflow inválido: falha em 0 s, sem log) e só foi percebido depois do push.

Precisa de PyYAML (pip install pyyaml); sem ele os testes são pulados. A checagem de shell precisa de `bash` (há no runner do GitHub e no Git Bash).
Uso: python -m unittest discover -s tools -p "test_workflows.py"
"""
import re
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path

try:
    import yaml
except ImportError:  # pragma: no cover
    yaml = None

RAIZ = Path(__file__).resolve().parent.parent
# Repositório único (SaibaTudo): os workflows ficam na raiz do repositório, com o prefixo do app.
REPO = next(p for p in [RAIZ, *RAIZ.parents] if (p / ".github" / "workflows").is_dir())
GITHUB = REPO / ".github"
WORKFLOWS = sorted((GITHUB / "workflows").glob("quimica-*.yml"))
BASH = shutil.which("bash")


def _carregar(p: Path):
    return yaml.safe_load(p.read_text(encoding="utf-8"))


@unittest.skipIf(yaml is None, "PyYAML não instalado")
class Yaml(unittest.TestCase):
    def test_ha_workflows(self):
        self.assertGreaterEqual(len(WORKFLOWS), 3)

    def test_todos_os_yaml_do_github_sao_validos(self):
        for p in [*WORKFLOWS, *GITHUB.glob("*.yml")]:
            with self.subTest(arquivo=p.name):
                self.assertIsInstance(_carregar(p), dict)

    def test_estrutura_minima_dos_workflows(self):
        for p in WORKFLOWS:
            with self.subTest(arquivo=p.name):
                d = _carregar(p)
                self.assertIn("name", d)
                self.assertTrue("on" in d or True in d, "gatilho (`on`; o YAML 1.1 lê `on` como True)")
                self.assertTrue(d.get("jobs"), "sem jobs")
                for nome, job in d["jobs"].items():
                    self.assertIn("runs-on", job, nome)
                    self.assertTrue(job.get("steps"), f"{nome}: sem steps")
                    for passo in job["steps"]:
                        self.assertTrue("run" in passo or "uses" in passo, f"{nome}: passo sem run/uses: {passo}")

    def test_workflows_com_escrita_declaram_permissoes(self):
        # quem faz push, abre issue ou PR precisa dizer o que pode (o padrão do repositório pode ser só leitura)
        for nome in ("quimica-data-refresh.yml", "quimica-data-freshness.yml"):
            with self.subTest(arquivo=nome):
                self.assertIn("permissions", _carregar(GITHUB / "workflows" / nome))

    def test_nenhum_workflow_usa_segredo_em_if_de_job_sem_env(self):
        # `secrets` não existe em `if:` de job/step: erro clássico que invalida o workflow
        for p in WORKFLOWS:
            with self.subTest(arquivo=p.name):
                for nome, job in _carregar(p)["jobs"].items():
                    for passo in job["steps"]:
                        cond = str(passo.get("if", ""))
                        self.assertNotIn("secrets.", cond, f"{nome}: `secrets` não pode ser usado em if (use env)")


    def test_regras_do_repositorio_unico(self):
        # CLAUDE.md da raiz, regra 2: pasta do app como diretório de trabalho, filtros de caminho só do app (ou do próprio workflow) e
        # concorrência com o prefixo do app
        for p in WORKFLOWS:
            with self.subTest(arquivo=p.name):
                d = _carregar(p)
                self.assertTrue(str(d["name"]).startswith("Química"), d["name"])
                self.assertEqual(d.get("defaults", {}).get("run", {}).get("working-directory"), "apps/quimica")
                gatilho = d.get("on", d.get(True)) or {}
                for evento in ("push", "pull_request"):
                    for caminho in (gatilho.get(evento) or {}).get("paths", []) if isinstance(gatilho, dict) else []:
                        self.assertTrue(caminho.lstrip("!").startswith("apps/quimica/") or caminho == f".github/workflows/{p.name}", caminho)
                if "concurrency" in d:
                    grupo = d["concurrency"]["group"] if isinstance(d["concurrency"], dict) else d["concurrency"]
                    self.assertTrue(str(grupo).startswith("quimica-"), grupo)

    def test_data_refresh_compara_pacotes_antes_de_publicar(self):
        # PENDENCIAS 8.3: divergência de números entre o pacote novo e o publicado bloqueia a publicação (tools/comparar_pacotes.py)
        d = _carregar(GITHUB / "workflows" / "quimica-data-refresh.yml")
        passos = d["jobs"]["atualizar"]["steps"]
        ids = [p.get("id") for p in passos]
        for obrigatorio in ("build", "comparar", "publicar"):
            self.assertIn(obrigatorio, ids)
        i_build, i_comp, i_pub = ids.index("build"), ids.index("comparar"), ids.index("publicar")
        self.assertLess(i_build, i_comp)
        self.assertLess(i_comp, i_pub)
        comp = passos[i_comp]
        self.assertIn("tools/comparar_pacotes.py", comp["run"])
        self.assertIn("--anterior-reserva", comp["run"])
        self.assertIn("inputs.rapido != true", str(comp["if"]), "o modo rápido nunca publica nem é comparado")
        self.assertTrue(comp.get("continue-on-error"), "a issue é aberta no passo seguinte; o passo de bloqueio derruba a execução")
        # a entrada `permitir` passa por env (nunca ${{ }} direto num script de shell) e os relatórios ficam fora de apps/quimica
        self.assertIn("PERMITIR", comp["env"])
        self.assertIn("$RUNNER_TEMP/comparacao.txt", comp["run"])
        texto = chr(10).join(p.get("run", "") for p in passos)
        self.assertNotIn("inputs.permitir", texto)
        gatilho = d.get("on", d.get(True))
        self.assertIn("permitir", gatilho["workflow_dispatch"]["inputs"])
        # entre a comparação e a publicação há um passo que falha quando a comparação falhou
        bloqueio = [p for p in passos[i_comp + 1:i_pub] if "exit 1" in p.get("run", "") and "comparar" in str(p.get("if", ""))]
        self.assertTrue(bloqueio, "falta o passo que bloqueia a publicação")
        # issue com etiqueta própria (a de frescor `alerta-dados-quimica` é fechada pelo outro workflow) e permissão para abri-la
        self.assertEqual(d["permissions"].get("issues"), "write")
        self.assertIn("divergencia-dados-quimica", texto)
        self.assertNotIn("alerta-dados-quimica", texto)
        # o pacote versionado é guardado ANTES do build (que troca data/quimica no lugar) para servir de reserva da comparação
        guarda = [i for i, p in enumerate(passos) if "pacote-versionado" in p.get("run", "") and "cp -r" in p.get("run", "")]
        self.assertTrue(guarda and guarda[0] < i_build)

    def test_android_ci_sem_segredos_e_com_verificador(self):
        p = GITHUB / "workflows" / "quimica-android-ci.yml"
        texto = p.read_text(encoding="utf-8")
        self.assertNotIn("secrets.", texto, "o CI Android da Química não usa segredos (release sem assinatura)")
        runs = chr(10).join(passo.get("run", "") for job in _carregar(p)["jobs"].values() for passo in job["steps"])
        for tarefa in (":app:testDebugUnitTest", ":app:lintRelease", ":app:assembleRelease"):
            self.assertIn(tarefa, runs)
        self.assertIn("tools/verificar_release.py", runs)
        caminhos = _carregar(p)[True]["push"]["paths"]
        for c in ("apps/quimica/app/**", "apps/quimica/contracts/**", "apps/quimica/data/**", "apps/quimica/tools/verificar_release.py"):
            self.assertIn(c, caminhos)


@unittest.skipIf(yaml is None or BASH is None, "PyYAML ou bash ausente")
class Shell(unittest.TestCase):
    def test_sintaxe_de_shell_de_cada_passo_run(self):
        for p in WORKFLOWS:
            for nome, job in _carregar(p)["jobs"].items():
                for i, passo in enumerate(job["steps"]):
                    script = passo.get("run")
                    if not script:
                        continue
                    with self.subTest(arquivo=p.name, job=nome, passo=passo.get("name", i)):
                        limpo = re.sub(r"\$\{\{.*?\}\}", "X", script, flags=re.S)  # expressões do Actions não são shell
                        with tempfile.NamedTemporaryFile("w", suffix=".sh", delete=False, encoding="utf-8", newline="\n") as f:
                            f.write(limpo)
                        try:
                            r = subprocess.run([BASH, "-n", f.name], capture_output=True, text=True)
                        finally:
                            Path(f.name).unlink(missing_ok=True)
                        self.assertEqual(r.returncode, 0, r.stderr)


if __name__ == "__main__":
    unittest.main()
