import React from "react";
import { Link } from "react-router-dom";

export function TermsPage() {
  return (
    <div className="container" style={{ maxWidth: 820 }}>
      <div className="cardElev" style={{ padding: 18 }}>
        <div className="row" style={{ marginBottom: 14 }}>
          <img src="/logo-growlify-mark.svg" alt="Growlify" className="logoMark" />
          <div>
            <p className="h1">Growlify</p>
            <p className="muted" style={{ margin: "6px 0 0" }}>
              Seu Administrador Financeiro Inteligente
            </p>
          </div>
        </div>

        <p className="h2" style={{ marginBottom: 10 }}>
          Termos e responsabilidades
        </p>

        <div className="card" style={{ padding: 14 }}>
          <p className="text2" style={{ marginTop: 0 }}>
            Estes termos descrevem o uso do Growlify como ferramenta de organização financeira. Ao usar o app, você concorda com as responsabilidades abaixo.
          </p>

          <p className="h3" style={{ margin: "14px 0 8px" }}>
            1) Natureza do serviço
          </p>
          <ul className="muted" style={{ margin: 0, paddingLeft: 18 }}>
            <li>O Growlify não é banco, não realiza pagamentos e não conecta em contas bancárias.</li>
            <li>O Growlify não emite boletos, cobranças, notas fiscais ou faturas.</li>
            <li>As informações exibidas são educacionais e de organização. Não substituem orientação profissional.</li>
          </ul>

          <p className="h3" style={{ margin: "14px 0 8px" }}>
            2) Responsabilidade do usuário
          </p>
          <ul className="muted" style={{ margin: 0, paddingLeft: 18 }}>
            <li>Você é responsável pelos dados inseridos (valores, datas, categorias e descrições).</li>
            <li>Você é responsável por manter seu e-mail e sua senha em segurança.</li>
            <li>Você pode excluir lançamentos e categorias conforme as opções disponíveis no app.</li>
          </ul>

          <p className="h3" style={{ margin: "14px 0 8px" }}>
            3) Assinatura e teste de 7 dias
          </p>
          <ul className="muted" style={{ margin: 0, paddingLeft: 18 }}>
            <li>Plano Growlify: R$ 27,90/mês.</li>
            <li>Teste gratuito por 7 dias com cartão obrigatório para iniciar.</li>
            <li>Se você cancelar antes do fim do teste, não há cobrança.</li>
            <li>Você pode cancelar quando quiser. Sem fidelidade.</li>
          </ul>

          <p className="h3" style={{ margin: "14px 0 8px" }}>
            4) Disponibilidade e suporte
          </p>
          <p className="muted" style={{ margin: 0 }}>
            O serviço pode passar por manutenções e ajustes. Em caso de indisponibilidade, o app mostrará mensagens de erro e você poderá tentar novamente.
          </p>
        </div>

        <p className="muted" style={{ marginTop: 12, marginBottom: 0 }}>
          <Link to="/entrar">Voltar</Link>
        </p>
      </div>
    </div>
  );
}
