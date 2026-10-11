# -*- coding: utf-8 -*-
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import exclusoes as X  # noqa: E402


def c(cid, nome, sinonimos=(), iupac=None):
    return {'cid': cid, 'nome': nome, 'sinonimos': list(sinonimos), 'nomeIupac': iupac}


class Exclusoes(unittest.TestCase):
    def test_exclui_guerra_quimica_e_droga_proscrita_pelo_nome_ou_sinonimo(self):
        mantidos, excluidos = X.filtrar_sensiveis(
            [c(7871, 'Sarin'), c(446220, 'Cloridrato', ['Cocaína']), c(1615, 'Midomafetamine', ['MDMA']), c(702, 'Etanol')],
            cids_fixos=set(), log=lambda *_: None)
        self.assertEqual([m['cid'] for m in mantidos], [702])
        self.assertEqual({e['cid'] for e in excluidos}, {7871, 446220, 1615})
        self.assertIn('guerra química', next(e['motivo'] for e in excluidos if e['cid'] == 7871))

    def test_nao_exclui_a_lista_fixa_nem_por_trecho_de_nome(self):
        mantidos, excluidos = X.filtrar_sensiveis(
            [c(6371, 'Fosgênio', ['phosgene']), c(5288826, 'Morfina', ['morphine']), c(3345, 'Fentanil', ['fentanyl']),
             c(7871, 'Sarin')],
            cids_fixos={7871}, log=lambda *_: None)
        self.assertEqual(excluidos, [], 'fosgênio (não é "fosgênio oxima"), medicamentos e a lista fixa ficam')
        self.assertEqual(len(mantidos), 4)

    def test_comparacao_ignora_acento_caixa_e_espacos(self):
        self.assertTrue(X.motivo(c(1, 'Gás  Mostarda')))
        self.assertTrue(X.motivo(c(2, 'x', ['HEROÍNA'])))
        self.assertIsNone(X.motivo(c(3, 'Ácido acético', ['vinagre'])))


if __name__ == '__main__':
    unittest.main()
