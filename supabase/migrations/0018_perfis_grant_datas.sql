-- O painel admin lê data de cadastro e validação. Não são dados sensíveis
-- (CPF segue fora do grant). Concede a leitura dessas colunas.
grant select (criado_em, telefone_validado) on perfis to authenticated;
