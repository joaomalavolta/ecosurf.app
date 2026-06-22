-- Começar do zero: remove dados reportados de demonstração (ameaças/fotos/
-- denúncias). Mantém picos e regiões (a estrutura do litoral).
delete from denuncias;
delete from fotos;
delete from ameacas;
