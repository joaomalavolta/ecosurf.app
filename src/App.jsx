import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Bell,
  Camera,
  CheckCircle2,
  ChevronLeft,
  CircleAlert,
  Clock3,
  Droplets,
  FileText,
  Filter,
  Fish,
  Flame,
  HeartHandshake,
  Home,
  Image as ImageIcon,
  Layers3,
  LifeBuoy,
  Map,
  MapPin,
  Medal,
  Megaphone,
  MessageSquare,
  Mountain,
  Phone,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  Trophy,
  User,
  Users,
  Waves,
  Wind,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

const screens = [
  "Onboarding",
  "Login",
  "Home",
  "Mapa do Oceano",
  "Radar",
  "Favoritos",
  "Pico",
  "Timeline do Pico",
  "Ameaças costeiras",
  "Registro de ameaça",
  "Registrar",
  "Registro ambiental",
  "Mutirões",
  "Evento",
  "Sessão de limpeza",
  "Ciência",
  "Feed",
  "Impacto",
  "Notificações",
  "Perfil",
  "Admin",
];

const shellStyle =
  "mx-auto w-[390px] h-[844px] rounded-[34px] border border-slate-200 bg-white shadow-2xl overflow-hidden relative";

const oceanGradient =
  "bg-gradient-to-br from-sky-950 via-cyan-800 to-emerald-600 text-white";

function PhoneShell({ children }) {
  return (
    <div className={shellStyle}>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 z-30 h-6 w-40 rounded-b-2xl bg-slate-950" />
      <div className="h-full overflow-hidden bg-slate-50">{children}</div>
    </div>
  );
}

function Header({ title, subtitle, back = false, actions }) {
  return (
    <div className={`${oceanGradient} px-5 pt-10 pb-5`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          {back ? (
            <button className="mt-1 rounded-full bg-white/15 p-2">
              <ChevronLeft className="h-4 w-4" />
            </button>
          ) : null}
          <div>
            <div className="text-xl font-semibold tracking-tight">{title}</div>
            {subtitle ? (
              <div className="mt-1 text-sm text-white/80">{subtitle}</div>
            ) : null}
          </div>
        </div>
        {actions}
      </div>
    </div>
  );
}

function BottomNav() {
  const items = [
    [Home, "Início", true],
    [Map, "Mapa"],
    [Waves, "Radar"],
    [HeartHandshake, "Mutirões"],
    [User, "Perfil"],
  ];
  return (
    <div className="absolute bottom-0 left-0 right-0 border-t border-slate-200 bg-white/95 backdrop-blur px-3 py-3">
      <div className="grid grid-cols-5 gap-1 text-[11px]">
        {items.map(([Icon, label, active]) => (
          <div
            key={label}
            className={`flex flex-col items-center gap-1 rounded-2xl py-1 ${
              active ? "text-cyan-700" : "text-slate-500"
            }`}
          >
            <Icon className={`h-5 w-5 ${active ? "stroke-[2.4]" : ""}`} />
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function KPI({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl bg-white/14 px-3 py-2 backdrop-blur-sm">
      <div className="flex items-center gap-2 text-white/85 text-xs">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="mt-1 text-lg font-semibold text-white">{value}</div>
    </div>
  );
}

function OnboardingScreen() {
  return (
    <PhoneShell>
      <div className={`${oceanGradient} h-full px-6 pt-20 pb-8 flex flex-col`}>
        <div className="rounded-[30px] border border-white/15 bg-white/10 p-5 backdrop-blur">
          <Badge className="bg-white/15 text-white hover:bg-white/15">Ecosurf.app</Badge>
          <h1 className="mt-4 text-3xl font-semibold leading-tight">
            Surf, ciência cidadã e ação pela conservação do Oceano.
          </h1>
          <p className="mt-4 text-sm leading-6 text-white/82">
            Acompanhe as condições do mar, registre impactos ambientais, participe de mutirões e gere dados para proteger praias, picos e ecossistemas costeiros.
          </p>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <KPI icon={Waves} label="Picos ativos" value="34" />
            <KPI icon={HeartHandshake} label="Mutirões" value="12" />
            <KPI icon={Droplets} label="Registros do Oceano" value="1.8k" />
            <KPI icon={Users} label="Comunidade" value="3.4k" />
          </div>
        </div>

        <div className="mt-6 grid gap-3">
          {[
            [Waves, "Veja o mar pela comunidade em tempo real"],
            [Flame, "Mapeie lixo, poluição e pressão costeira"],
            [HeartHandshake, "Mobilize pessoas e gere impacto real"],
          ].map(([Icon, text]) => (
            <div key={text} className="flex items-center gap-3 rounded-2xl bg-white/10 p-4">
              <div className="rounded-xl bg-white/15 p-2">
                <Icon className="h-5 w-5" />
              </div>
              <div className="text-sm text-white">{text}</div>
            </div>
          ))}
        </div>

        <div className="mt-auto space-y-3">
          <Button className="h-12 w-full rounded-2xl bg-white text-sky-900 hover:bg-white">
            Entrar no app
          </Button>
          <Button
            variant="outline"
            className="h-12 w-full rounded-2xl border-white/30 bg-transparent text-white hover:bg-white/10"
          >
            Explorar o Oceano
          </Button>
        </div>
      </div>
    </PhoneShell>
  );
}

function LoginScreen() {
  return (
    <PhoneShell>
      <Header
        title="Acesso simples e seguro"
        subtitle="Login por telefone para reduzir fraudes e fortalecer a comunidade."
        back
      />
      <div className="px-5 py-5 space-y-5">
        <Card className="rounded-3xl border-0 shadow-sm">
          <CardContent className="p-5 space-y-4">
            <div>
              <div className="text-sm font-medium text-slate-700">Número de celular</div>
              <div className="mt-2 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <Phone className="h-4 w-4 text-slate-500" />
                <span className="text-sm text-slate-800">+55 (13) 99999-9999</span>
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-slate-700">Código de acesso</div>
              <div className="mt-2 grid grid-cols-6 gap-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-12 rounded-2xl border border-slate-200 bg-slate-50"
                  />
                ))}
              </div>
              <p className="mt-3 text-xs leading-5 text-slate-500">
                Use WhatsApp como canal principal e SMS como fallback para entrada rápida no mobile.
              </p>
            </div>
            <Button className="h-12 w-full rounded-2xl bg-cyan-700 hover:bg-cyan-800">
              Continuar
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Benefícios desse acesso</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-600">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-4 w-4 text-cyan-700" /> Mais confiança nos registros da comunidade
            </div>
            <div className="flex items-center gap-3">
              <Bell className="h-4 w-4 text-cyan-700" /> Alertas dos seus picos e praias favoritas
            </div>
            <div className="flex items-center gap-3">
              <Medal className="h-4 w-4 text-cyan-700" /> Reputação e badges com participação real
            </div>
          </CardContent>
        </Card>
      </div>
    </PhoneShell>
  );
}

function HomeScreen() {
  return (
    <PhoneShell>
      <Header
        title="Bom dia, João"
        subtitle="O mar está ativo e a comunidade registrou 19 atualizações hoje."
        actions={
          <button className="rounded-full bg-white/15 p-2">
            <Bell className="h-4 w-4" />
          </button>
        }
      />
      <div className="px-4 py-4 pb-24 space-y-4 overflow-y-auto h-[calc(100%-100px)]">
        <div className="grid grid-cols-2 gap-3 -mt-10 relative z-10">
          <Card className="rounded-3xl border-0 shadow-md">
            <CardContent className="p-4">
              <div className="text-xs text-slate-500">Condição dos picos</div>
              <div className="mt-1 text-2xl font-semibold">Boa</div>
              <div className="mt-2 text-xs text-emerald-600">6 picos atualizados</div>
            </CardContent>
          </Card>
          <Card className="rounded-3xl border-0 shadow-md">
            <CardContent className="p-4">
              <div className="text-xs text-slate-500">Impacto do mês</div>
              <div className="mt-1 text-2xl font-semibold">842 kg</div>
              <div className="mt-2 text-xs text-cyan-700">Lixo retirado coletivamente</div>
            </CardContent>
          </Card>
        </div>

        <div className="rounded-3xl bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold">Ação rápida</div>
              <div className="text-xs text-slate-500">
                Registre o mar, um impacto ou sua presença em mutirão
              </div>
            </div>
            <Button className="rounded-2xl bg-cyan-700 hover:bg-cyan-800">
              <Plus className="mr-2 h-4 w-4" />
              Registrar
            </Button>
          </div>
        </div>

        <Card className="rounded-3xl border-0 shadow-sm overflow-hidden">
          <div className={`${oceanGradient} p-4`}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-white/80">Radar agora</div>
                <div className="mt-1 text-lg font-semibold">Praia do Sonho</div>
                <div className="mt-1 text-xs text-white/80">
                  Ondas médias · vento moderado · 34 min atrás
                </div>
              </div>
              <Waves className="h-8 w-8 text-white" />
            </div>
          </div>
          <CardContent className="p-4">
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-2xl bg-slate-50 p-3">
                <Wind className="mx-auto mb-2 h-4 w-4 text-cyan-700" />
                Vento NE
              </div>
              <div className="rounded-2xl bg-slate-50 p-3">
                <Waves className="mx-auto mb-2 h-4 w-4 text-cyan-700" />
                0.8–1.2m
              </div>
              <div className="rounded-2xl bg-slate-50 p-3">
                <Users className="mx-auto mb-2 h-4 w-4 text-cyan-700" />
                Lotação média
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="text-sm font-semibold">Em destaque</div>
            <button className="text-xs text-cyan-700">Ver tudo</button>
          </div>
          {[
            ["Mutirão na Praia dos Pescadores", "Sábado · 8h", "46 inscritos", HeartHandshake],
            ["Alerta de lixo no canto sul", "Hoje", "13 registros", Flame],
            ["Nova missão de ciência cidadã", "Esta semana", "Microplásticos", Sparkles],
          ].map(([title, sub, meta, Icon]) => (
            <Card key={title} className="rounded-3xl border-0 shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                  <Icon className="h-6 w-6 text-cyan-700" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-slate-900">{title}</div>
                  <div className="text-xs text-slate-500">{sub}</div>
                  <div className="mt-1 text-xs text-cyan-700">{meta}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
      <BottomNav />
    </PhoneShell>
  );
}

function OceanMapScreen() {
  return (
    <PhoneShell>
      <div className="relative h-full bg-[radial-gradient(circle_at_15%_20%,#d8f2ff,transparent_24%),radial-gradient(circle_at_80%_35%,#d8f5e9,transparent_20%),linear-gradient(180deg,#eff8ff,#eaf2f5)]">
        <div className="absolute inset-x-0 top-0 z-20 px-4 pt-10">
          <div className="rounded-3xl bg-white/95 p-3 shadow-lg backdrop-blur">
            <div className="flex items-center gap-2 rounded-2xl bg-slate-100 px-3 py-2.5">
              <Search className="h-4 w-4 text-slate-500" />
              <span className="text-sm text-slate-500">
                Buscar praia, pico, mutirão ou registro
              </span>
            </div>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {["Tudo", "Picos", "Lixo", "Mutirões", "Ciência", "Alertas"].map((item, i) => (
                <Badge
                  key={item}
                  className={`rounded-full px-3 py-1.5 ${
                    i === 0
                      ? "bg-cyan-700 text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {item}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <div className="absolute inset-0">
          {[
            ["top-[30%] left-[20%]", "P", "bg-cyan-700"],
            ["top-[42%] left-[48%]", "M", "bg-emerald-600"],
            ["top-[58%] left-[30%]", "A", "bg-red-500"],
            ["top-[66%] left-[68%]", "C", "bg-amber-500"],
          ].map(([pos, letter, color]) => (
            <div key={pos} className={`absolute ${pos}`}>
              <div
                className={`rounded-full ${color} px-3 py-2 text-xs font-semibold text-white shadow-lg`}
              >
                {letter}
              </div>
            </div>
          ))}
        </div>

        <div className="absolute right-4 top-44 z-10 flex flex-col gap-3">
          <button className="rounded-2xl bg-white p-3 shadow">
            <Filter className="h-4 w-4 text-slate-700" />
          </button>
          <button className="rounded-2xl bg-white p-3 shadow">
            <Layers3 className="h-4 w-4 text-slate-700" />
          </button>
          <button className="rounded-2xl bg-cyan-700 p-3 shadow">
            <Target className="h-4 w-4 text-white" />
          </button>
        </div>

        <div className="absolute inset-x-0 bottom-20 px-4">
          <Card className="rounded-[28px] border-0 shadow-xl">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
                <Waves className="h-7 w-7 text-cyan-700" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">Praia do Sonho</div>
                  <Badge className="bg-cyan-100 text-cyan-700 hover:bg-cyan-100">
                    Radar ativo
                  </Badge>
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  3 fotos hoje · 1 alerta ambiental próximo
                </div>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" className="rounded-xl bg-cyan-700 hover:bg-cyan-800">
                    Abrir
                  </Button>
                  <Button size="sm" variant="outline" className="rounded-xl">
                    Registrar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      <BottomNav />
    </PhoneShell>
  );
}

function RadarScreen() {
  return (
    <PhoneShell>
      <Header
        title="Radar Ecosurf"
        subtitle="Condições do mar, favoritos e reports da comunidade."
      />
      <div className="px-4 py-4 pb-24 space-y-4">
        <Card className="rounded-3xl border-0 shadow-sm overflow-hidden">
          <div className={`${oceanGradient} p-4`}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-white/80">Janela agora</div>
                <div className="mt-1 text-lg font-semibold">Praia do Sonho em alta</div>
                <div className="mt-1 text-xs text-white/80">
                  0.8–1.2m · terral leve · maré enchendo
                </div>
              </div>
              <Waves className="h-8 w-8 text-white" />
            </div>
          </div>
          <CardContent className="p-4 grid grid-cols-4 gap-2 text-center text-xs">
            <div className="rounded-2xl bg-slate-50 p-3">Agora</div>
            <div className="rounded-2xl bg-slate-50 p-3">+3h</div>
            <div className="rounded-2xl bg-slate-50 p-3">+6h</div>
            <div className="rounded-2xl bg-slate-50 p-3">+12h</div>
          </CardContent>
        </Card>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {[
            "Favoritos",
            "Melhores agora",
            "5 dias",
            "Com fotos novas",
            "Com alerta ambiental",
          ].map((f, i) => (
            <Badge
              key={f}
              className={`rounded-full px-3 py-1.5 ${
                i === 0
                  ? "bg-cyan-700 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-100"
              }`}
            >
              {f}
            </Badge>
          ))}
        </div>

        {[
          [
            "Praia do Sonho",
            "0.8–1.2m · terral cedo · boa janela",
            "4 fotos hoje",
            "5 dias favoráveis",
            "Boa",
          ],
          [
            "Canto do Forte",
            "0.5–0.9m · mar mexido",
            "2 fotos hoje",
            "2 dias favoráveis",
            "Regular",
          ],
          [
            "Praia dos Pescadores",
            "1.0–1.4m · vento lateral depois",
            "6 fotos hoje",
            "3 dias favoráveis",
            "Em alta",
          ],
        ].map(([title, sub, photos, next, note]) => (
          <Card key={title} className="rounded-3xl border-0 shadow-sm overflow-hidden">
            <div className="h-32 bg-[linear-gradient(180deg,#9adcf5,#d5eef7)]" />
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-slate-900">{title}</div>
                  <div className="text-xs text-slate-500">{sub}</div>
                </div>
                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                  {note}
                </Badge>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-500">
                <div className="rounded-2xl bg-slate-50 px-3 py-2">{photos}</div>
                <div className="rounded-2xl bg-slate-50 px-3 py-2">{next}</div>
              </div>
              <div className="mt-4 flex gap-2">
                <Button className="rounded-xl bg-cyan-700 hover:bg-cyan-800">Abrir pico</Button>
                <Button variant="outline" className="rounded-xl">
                  Postar report
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <BottomNav />
    </PhoneShell>
  );
}

function SpotScreen() {
  return (
    <PhoneShell>
      <Header
        title="Praia do Sonho"
        subtitle="Forecast, reports, linha do tempo e contexto ambiental do pico."
        back
      />
      <div className="px-4 py-4 pb-24 space-y-4">
        <Card className="rounded-3xl border-0 shadow-sm overflow-hidden">
          <div className={`${oceanGradient} p-4`}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-white/80">Condição agora</div>
                <div className="mt-1 text-lg font-semibold">Boa com séries médias</div>
                <div className="mt-1 text-xs text-white/80">
                  Vento NE · maré enchendo · crowd moderado
                </div>
              </div>
              <Waves className="h-8 w-8 text-white" />
            </div>
          </div>
          <CardContent className="p-4 grid grid-cols-4 gap-2 text-center text-xs">
            <div className="rounded-2xl bg-slate-50 p-3">
              Agora
              <br />
              1.1m
            </div>
            <div className="rounded-2xl bg-slate-50 p-3">
              +3h
              <br />
              1.0m
            </div>
            <div className="rounded-2xl bg-slate-50 p-3">
              +6h
              <br />
              0.9m
            </div>
            <div className="rounded-2xl bg-slate-50 p-3">
              +1 dia
              <br />
              1.2m
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-3 gap-3">
          <Card className="rounded-3xl border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="text-xs text-slate-500">Favorito</div>
              <div className="mt-1 font-semibold">Sim</div>
            </CardContent>
          </Card>
          <Card className="rounded-3xl border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="text-xs text-slate-500">Reports hoje</div>
              <div className="mt-1 font-semibold">4</div>
            </CardContent>
          </Card>
          <Card className="rounded-3xl border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="text-xs text-slate-500">Alertas</div>
              <div className="mt-1 font-semibold">1</div>
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-3xl border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Reports recentes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              ["06:20", "Clássico no amanhecer", "Foto + observação"],
              ["09:10", "Subiu um pouco e encheu", "Foto + vento lateral"],
              ["12:45", "Mar mexido com crowd moderado", "Foto + lotação"],
            ].map(([time, text, sub]) => (
              <div key={time} className="rounded-2xl bg-slate-50 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">{time}</span>
                  <span className="text-xs text-slate-500">{sub}</span>
                </div>
                <div className="mt-1 text-sm text-slate-700">{text}</div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Contexto do Oceano</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-2xl bg-amber-50 p-3 text-sm text-amber-800">
              Há 1 alerta recente de resíduos no canto sul desta praia.
            </div>
            <div className="rounded-2xl bg-emerald-50 p-3 text-sm text-emerald-800">
              Mutirão agendado para sábado, 8h, com foco em limpeza da faixa de areia.
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" className="h-12 rounded-2xl">
            Seguir pico
          </Button>
          <Button className="h-12 rounded-2xl bg-cyan-700 hover:bg-cyan-800">
            Postar report
          </Button>
        </div>
      </div>
    </PhoneShell>
  );
}

function RegisterScreen() {
  return (
    <PhoneShell>
      <Header
        title="Registrar"
        subtitle="Ponto central de entrada para reports, ameaças, dados e limpezas."
        back
      />
      <div className="px-5 py-5 pb-24 space-y-4">
        {[
          [Waves, "Report do pico", "Atualize a condição do mar com foto, lotação e observação."],
          [
            CircleAlert,
            "Ameaça costeira",
            "Registre erosão, poluição, esgoto, dano à restinga ou outra pressão.",
          ],
          [Flame, "Registro ambiental", "Mapeie lixo, resíduos e impactos no entorno da praia."],
          [Sparkles, "Ciência cidadã", "Envie um dado estruturado sobre o Oceano."],
          [
            HeartHandshake,
            "Sessão de limpeza",
            "Inicie uma coleta individual ou vinculada a um mutirão.",
          ],
        ].map(([Icon, title, text]) => (
          <button
            key={title}
            className="w-full rounded-3xl border border-slate-200 bg-white p-4 text-left shadow-sm"
          >
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-slate-100 p-3">
                <Icon className="h-5 w-5 text-cyan-700" />
              </div>
              <div>
                <div className="font-medium text-slate-900">{title}</div>
                <div className="mt-1 text-sm leading-6 text-slate-500">{text}</div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </PhoneShell>
  );
}

function EnvReportScreen() {
  return (
    <PhoneShell>
      <Header
        title="Registro ambiental"
        subtitle="Fluxo rápido para mapear problemas e pressões sobre o Oceano."
        back
      />
      <div className="px-5 py-4 pb-24 space-y-4">
        <div className="flex items-center gap-2">
          {[1, 2, 3, 4].map((step, i) => (
            <React.Fragment key={step}>
              <div
                className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                  step < 4 ? "bg-cyan-700 text-white" : "bg-slate-200 text-slate-600"
                }`}
              >
                {step}
              </div>
              {i < 3 ? (
                <div
                  className={`h-1 flex-1 rounded-full ${
                    step < 4 ? "bg-cyan-700" : "bg-slate-200"
                  }`}
                />
              ) : null}
            </React.Fragment>
          ))}
        </div>

        <Card className="rounded-3xl border-0 shadow-sm">
          <CardContent className="p-4 space-y-4">
            <div>
              <div className="text-sm font-medium">Categoria</div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                {[
                  ["Lixo", Flame],
                  ["Água suspeita", Droplets],
                  ["Fauna impactada", Fish],
                  ["Erosão", Mountain],
                ].map(([label, Icon], i) => (
                  <button
                    key={label}
                    className={`rounded-2xl border p-4 text-left ${
                      i === 0
                        ? "border-cyan-700 bg-cyan-50"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <Icon
                      className={`mb-2 h-5 w-5 ${
                        i === 0 ? "text-cyan-700" : "text-slate-500"
                      }`}
                    />
                    <div className="text-sm font-medium">{label}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="text-sm font-medium">Foto</div>
              <div className="mt-2 rounded-[26px] border-2 border-dashed border-slate-200 bg-slate-50 p-6 text-center">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm">
                  <Camera className="h-6 w-6 text-slate-700" />
                </div>
                <div className="font-medium">Capturar evidência</div>
                <div className="mt-1 text-xs text-slate-500">
                  Imagem ao vivo fortalece a confiabilidade do registro.
                </div>
              </div>
            </div>

            <div>
              <div className="text-sm font-medium">Praia e localização</div>
              <div className="mt-2 rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
                Praia dos Pescadores · coordenadas confirmadas
              </div>
            </div>

            <div>
              <div className="text-sm font-medium">Descrição curta</div>
              <div className="mt-2 min-h-24 rounded-2xl border border-slate-200 p-4 text-sm text-slate-500">
                Ex.: resíduos plásticos espalhados na faixa de areia, com maior concentração perto da saída do canal.
              </div>
            </div>
          </CardContent>
        </Card>

        <Button className="h-12 w-full rounded-2xl bg-cyan-700 hover:bg-cyan-800">
          Publicar registro
        </Button>
      </div>
    </PhoneShell>
  );
}

function CleanupsScreen() {
  return (
    <PhoneShell>
      <Header
        title="Mutirões"
        subtitle="Mobilização social com organização, check-in e resultados mensuráveis."
      />
      <div className="px-4 py-4 pb-24 space-y-4">
        <Card className="rounded-3xl border-0 shadow-sm overflow-hidden">
          <div className={`${oceanGradient} p-4`}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-white/80">Próximo mutirão</div>
                <div className="mt-1 text-lg font-semibold">Praia dos Pescadores</div>
                <div className="mt-1 text-xs text-white/80">
                  Sábado · 8h às 11h · 46 inscritos
                </div>
              </div>
              <HeartHandshake className="h-8 w-8 text-white" />
            </div>
          </div>
          <CardContent className="p-4 flex gap-2">
            <Button className="flex-1 rounded-xl bg-cyan-700 hover:bg-cyan-800">
              Inscrever-se
            </Button>
            <Button variant="outline" className="flex-1 rounded-xl">
              Ver detalhes
            </Button>
          </CardContent>
        </Card>

        {[
          ["Mutirão Restinga Viva", "Domingo · Peruíbe", "22 vagas"],
          ["Limpeza colaborativa do canal", "Quarta · Santos", "13 vagas"],
        ].map(([title, sub, vagas]) => (
          <Card key={title} className="rounded-3xl border-0 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                <HeartHandshake className="h-6 w-6 text-cyan-700" />
              </div>
              <div className="flex-1">
                <div className="font-medium">{title}</div>
                <div className="text-xs text-slate-500">{sub}</div>
                <div className="mt-1 text-xs text-cyan-700">{vagas}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <BottomNav />
    </PhoneShell>
  );
}

function EventScreen() {
  return (
    <PhoneShell>
      <Header
        title="Mutirão Praia dos Pescadores"
        subtitle="Página completa do evento com participação e impacto."
        back
      />
      <div className="px-4 py-4 pb-24 space-y-4">
        <div className="h-44 rounded-[28px] bg-[linear-gradient(180deg,#9adcf5,#dff6ea)]" />
        <Card className="rounded-3xl border-0 shadow-sm">
          <CardContent className="p-4 grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-xs text-slate-500">Data</div>
              <div className="mt-1 font-semibold">Sáb · 8h</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Inscritos</div>
              <div className="mt-1 font-semibold">46</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Meta</div>
              <div className="mt-1 font-semibold">300 kg</div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Sobre a ação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-6 text-slate-600">
            <p>
              Encontro comunitário voltado à limpeza da faixa de areia, triagem básica dos resíduos e sensibilização sobre conservação do Oceano.
            </p>
            <div className="rounded-2xl bg-slate-50 p-3">
              Ponto de encontro: quiosque central · levar garrafa reutilizável, boné e luvas.
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Resultados esperados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              ["Voluntários mobilizados", 76],
              ["Pesagem prevista", 64],
              ["Cobertura territorial", 52],
            ].map(([label, val]) => (
              <div key={label}>
                <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                  <span>{label}</span>
                  <span>{val}%</span>
                </div>
                <Progress value={val} className="h-3" />
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" className="h-12 rounded-2xl">
            Compartilhar
          </Button>
          <Button className="h-12 rounded-2xl bg-cyan-700 hover:bg-cyan-800">
            Fazer check-in
          </Button>
        </div>
      </div>
    </PhoneShell>
  );
}

function ScienceScreen() {
  return (
    <PhoneShell>
      <Header
        title="Ciência cidadã"
        subtitle="Formulários estruturados para gerar dados úteis sobre o Oceano."
      />
      <div className="px-4 py-4 pb-24 space-y-4">
        {[
          [Droplets, "Qualidade visual da água", "Cor, odor, espuma, turbidez, sinais de esgoto."],
          [Flame, "Resíduos na praia", "Composição, concentração e recorrência."],
          [Fish, "Fauna observada", "Aves, peixes, fauna impactada ou ocorrências especiais."],
          [Sparkles, "Microplásticos", "Presença visual, área observada e evidência."],
        ].map(([Icon, title, text]) => (
          <Card key={title} className="rounded-3xl border-0 shadow-sm">
            <CardContent className="p-4 flex items-start gap-3">
              <div className="rounded-2xl bg-slate-100 p-3">
                <Icon className="h-5 w-5 text-cyan-700" />
              </div>
              <div className="flex-1">
                <div className="font-medium">{title}</div>
                <div className="mt-1 text-sm leading-6 text-slate-500">{text}</div>
                <Button size="sm" className="mt-3 rounded-xl bg-cyan-700 hover:bg-cyan-800">
                  Iniciar
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <BottomNav />
    </PhoneShell>
  );
}

function FeedScreen() {
  return (
    <PhoneShell>
      <Header
        title="Feed do Oceano"
        subtitle="Comunidade, atualizações ambientais e cultura oceânica no mesmo fluxo."
      />
      <div className="px-4 py-4 pb-24 space-y-4">
        {[
          [
            "Nova foto no pico",
            "Praia do Sonho recebeu uma atualização com séries melhores no amanhecer.",
            Waves,
          ],
          [
            "Resultado de mutirão",
            "214 kg de resíduos retirados da faixa de areia e restinga.",
            HeartHandshake,
          ],
          [
            "Registro ambiental",
            "Comunidade identificou aumento de plástico no canto sul.",
            Flame,
          ],
        ].map(([title, text, Icon]) => (
          <Card key={title} className="rounded-3xl border-0 shadow-sm overflow-hidden">
            <div className="h-40 bg-[linear-gradient(180deg,#b3e6f9,#f6fbfd)]" />
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-xs text-cyan-700">
                <Icon className="h-3.5 w-3.5" />
                Atualização da comunidade
              </div>
              <div className="mt-2 font-semibold text-slate-900">{title}</div>
              <div className="mt-1 text-sm leading-6 text-slate-500">{text}</div>
              <div className="mt-4 flex gap-4 text-xs text-slate-500">
                <span>Curtir</span>
                <span>Comentar</span>
                <span>Compartilhar</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <BottomNav />
    </PhoneShell>
  );
}

function ImpactScreen() {
  return (
    <PhoneShell>
      <Header
        title="Impacto"
        subtitle="Indicadores claros para comunidade, parceiros e relatórios."
      />
      <div className="px-4 py-4 pb-24 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Card className="rounded-3xl border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="text-xs text-slate-500">Lixo retirado</div>
              <div className="mt-1 text-2xl font-semibold">11.6 t</div>
            </CardContent>
          </Card>
          <Card className="rounded-3xl border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="text-xs text-slate-500">Voluntários</div>
              <div className="mt-1 text-2xl font-semibold">1.248</div>
            </CardContent>
          </Card>
          <Card className="rounded-3xl border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="text-xs text-slate-500">Picos monitorados</div>
              <div className="mt-1 text-2xl font-semibold">34</div>
            </CardContent>
          </Card>
          <Card className="rounded-3xl border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="text-xs text-slate-500">Registros científicos</div>
              <div className="mt-1 text-2xl font-semibold">962</div>
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-3xl border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Evolução mensal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              ["Janeiro", 38],
              ["Fevereiro", 52],
              ["Março", 67],
              ["Abril", 74],
            ].map(([label, val]) => (
              <div key={label}>
                <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                  <span>{label}</span>
                  <span>{val}</span>
                </div>
                <div className="h-3 rounded-full bg-slate-100">
                  <div
                    className="h-3 rounded-full bg-cyan-700"
                    style={{ width: `${val}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Hotspots</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              ["Praia dos Pescadores", "Alta recorrência de plástico flexível"],
              ["Canal Sul", "Acúmulo sazonal após chuva"],
              ["Praia do Sonho", "Engajamento elevado de surfistas e comunidade"],
            ].map(([place, text]) => (
              <div key={place} className="rounded-2xl bg-slate-50 p-3">
                <div className="font-medium">{place}</div>
                <div className="text-xs text-slate-500">{text}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
      <BottomNav />
    </PhoneShell>
  );
}

function NotificationsScreen() {
  return (
    <PhoneShell>
      <Header
        title="Notificações"
        subtitle="Tudo o que importa para seu território, seus picos e suas ações."
      />
      <div className="px-4 py-4 pb-24 space-y-3">
        {[
          ["Nova foto no seu pico", "Praia do Sonho recebeu atualização há 12 minutos.", true],
          ["Mutirão confirmado", "Sua inscrição no mutirão de sábado foi concluída.", false],
          [
            "Alerta ambiental",
            "Resíduos aumentaram no canto sul da praia monitorada.",
            true,
          ],
        ].map(([title, text, unread]) => (
          <Card
            key={title}
            className={`rounded-3xl border-0 shadow-sm ${
              unread ? "ring-1 ring-cyan-100" : ""
            }`}
          >
            <CardContent className="p-4 flex gap-3">
              <div
                className={`mt-1 h-2.5 w-2.5 rounded-full ${
                  unread ? "bg-cyan-700" : "bg-slate-300"
                }`}
              />
              <div>
                <div className="font-medium text-slate-900">{title}</div>
                <div className="mt-1 text-sm leading-6 text-slate-600">{text}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <BottomNav />
    </PhoneShell>
  );
}

function ProfileScreen() {
  return (
    <PhoneShell>
      <Header
        title="Seu perfil"
        subtitle="Reputação, histórico e identidade dentro da comunidade Ecosurf."
      />
      <div className="px-4 py-4 pb-24 space-y-4">
        <Card className="rounded-3xl border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-3xl bg-slate-200" />
              <div>
                <div className="text-lg font-semibold">João Malavolta</div>
                <div className="text-sm text-slate-500">Nível: Embaixador do Oceano</div>
                <div className="mt-2 inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
                  Conta validada por telefone
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-3 gap-3">
          <Card className="rounded-3xl border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="text-xs text-slate-500">Picos</div>
              <div className="mt-1 text-xl font-semibold">18</div>
            </CardContent>
          </Card>
          <Card className="rounded-3xl border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="text-xs text-slate-500">Mutirões</div>
              <div className="mt-1 text-xl font-semibold">29</div>
            </CardContent>
          </Card>
          <Card className="rounded-3xl border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="text-xs text-slate-500">Precisão</div>
              <div className="mt-1 text-xl font-semibold">91%</div>
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-3xl border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Conquistas</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-sm">
            {[
              "Primeiro pico monitorado",
              "100 registros do Oceano",
              "5 mutirões concluídos",
              "Validador confiável",
            ].map((item) => (
              <div key={item} className="rounded-2xl bg-slate-50 p-3">
                {item}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Configurações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {[
              [Settings, "Preferências do app"],
              [Bell, "Alertas e notificações"],
              [LifeBuoy, "Ajuda e suporte"],
              [MessageSquare, "Fale com a equipe"],
            ].map(([Icon, label]) => (
              <div
                key={label}
                className="flex items-center gap-3 rounded-2xl bg-slate-50 px-3 py-3"
              >
                <Icon className="h-4 w-4 text-slate-600" />
                <span className="text-slate-700">{label}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
      <BottomNav />
    </PhoneShell>
  );
}

function AdminScreen() {
  return (
    <PhoneShell>
      <Header
        title="Painel de inteligência"
        subtitle="Visão executiva para conservação, mobilização e engenharia de dados."
      />
      <div className="px-4 py-4 pb-24 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Card className="rounded-3xl border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="text-xs text-slate-500">Hotspots ativos</div>
              <div className="mt-1 text-2xl font-semibold">9</div>
            </CardContent>
          </Card>
          <Card className="rounded-3xl border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="text-xs text-slate-500">Engajamento diário</div>
              <div className="mt-1 text-2xl font-semibold">68%</div>
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-3xl border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Distribuição de atividades</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              ["Radar de ondas", 81, "bg-cyan-700"],
              ["Registros ambientais", 58, "bg-red-500"],
              ["Mutirões", 42, "bg-emerald-600"],
              ["Ciência cidadã", 37, "bg-amber-500"],
            ].map(([label, val, color]) => (
              <div key={label}>
                <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                  <span>{label}</span>
                  <span>{val}</span>
                </div>
                <div className="h-3 rounded-full bg-slate-100">
                  <div
                    className={`h-3 rounded-full ${color}`}
                    style={{ width: `${val}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Prioridades territoriais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              ["Itanhaém", "Alta adesão no radar, baixa cobertura de ciência cidadã"],
              ["Santos", "Canal com recorrência crítica após chuva forte"],
              ["Peruíbe", "Mutirões com boa conversão e forte engajamento local"],
            ].map(([place, text]) => (
              <div key={place} className="rounded-2xl bg-slate-50 p-3">
                <div className="font-medium">{place}</div>
                <div className="text-xs text-slate-500">{text}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </PhoneShell>
  );
}

function FavoritesScreen() {
  return (
    <PhoneShell>
      <Header title="Favoritos" subtitle="Seus picos, praias e territórios acompanhados." />
      <div className="px-4 py-4 pb-24 space-y-4">
        {[
          ["Praia do Sonho", "Radar ativo · 4 fotos hoje", "1 alerta ambiental"],
          ["Praia dos Pescadores", "Mutirão sábado", "2 registros científicos"],
          ["Canto do Forte", "Condição regular", "sem alertas hoje"],
        ].map(([title, sub, meta]) => (
          <Card key={title} className="rounded-3xl border-0 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                <Star className="h-5 w-5 text-cyan-700" />
              </div>
              <div className="flex-1">
                <div className="font-medium">{title}</div>
                <div className="text-xs text-slate-500">{sub}</div>
                <div className="mt-1 text-xs text-cyan-700">{meta}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <BottomNav />
    </PhoneShell>
  );
}

function SpotTimelineScreen() {
  return (
    <PhoneShell>
      <Header
        title="Timeline do pico"
        subtitle="Comparação visual do dia e evolução das condições."
        back
      />
      <div className="px-4 py-4 pb-24 space-y-4">
        {[
          ["06:20", "Clássico no amanhecer", true],
          ["09:10", "Mais cheio e consistente", false],
          ["12:45", "Vento lateral e crowd maior", false],
          ["16:20", "Perdeu força no final da tarde", false],
        ].map(([time, text, highlight]) => (
          <div key={time} className="flex gap-3">
            <div
              className={`mt-1 h-2.5 w-2.5 rounded-full ${
                highlight ? "bg-emerald-600" : "bg-cyan-700"
              }`}
            />
            <div className="flex-1 rounded-3xl bg-white p-4 shadow-sm">
              <div className="h-28 rounded-2xl bg-[linear-gradient(180deg,#9adcf5,#d9eef5)]" />
              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs text-slate-500">{time}</span>
                <span className="text-xs text-slate-500">report comunitário</span>
              </div>
              <div className="mt-1 text-sm text-slate-700">{text}</div>
            </div>
          </div>
        ))}
      </div>
    </PhoneShell>
  );
}

function ThreatsScreen() {
  return (
    <PhoneShell>
      <Header
        title="Ameaças costeiras"
        subtitle="Mapa e lista das pressões sobre praias, picos e ecossistemas."
      />
      <div className="px-4 py-4 pb-24 space-y-4">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {["Todas", "Poluição", "Água", "Erosão", "Restinga", "Fauna"].map((f, i) => (
            <Badge
              key={f}
              className={`rounded-full px-3 py-1.5 ${
                i === 0
                  ? "bg-cyan-700 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-100"
              }`}
            >
              {f}
            </Badge>
          ))}
        </div>
        {[
          ["Resíduos no canto sul", "Praia do Sonho", "identificado"],
          ["Água com alteração visual", "Praia dos Pescadores", "em observação"],
          ["Erosão na duna frontal", "Peruíbe", "recorrente"],
        ].map(([title, place, status]) => (
          <Card key={title} className="rounded-3xl border-0 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                <CircleAlert className="h-5 w-5 text-red-500" />
              </div>
              <div className="flex-1">
                <div className="font-medium">{title}</div>
                <div className="text-xs text-slate-500">{place}</div>
                <div className="mt-2 inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-[11px] text-amber-700">
                  {status}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <BottomNav />
    </PhoneShell>
  );
}

function ThreatReportScreen() {
  return (
    <PhoneShell>
      <Header
        title="Registro de ameaça"
        subtitle="Fluxo simples inspirado em ameaça + foto + geotag."
        back
      />
      <div className="px-5 py-4 pb-24 space-y-4">
        <Card className="rounded-3xl border-0 shadow-sm">
          <CardContent className="p-4 space-y-4">
            <div>
              <div className="text-sm font-medium">Categoria da ameaça</div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                {[
                  ["Poluição plástica", Flame],
                  ["Água imprópria", Droplets],
                  ["Erosão", Mountain],
                  ["Dano à restinga", Sparkles],
                ].map(([label, Icon], i) => (
                  <button
                    key={label}
                    className={`rounded-2xl border p-4 text-left ${
                      i === 0
                        ? "border-cyan-700 bg-cyan-50"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <Icon
                      className={`mb-2 h-5 w-5 ${
                        i === 0 ? "text-cyan-700" : "text-slate-500"
                      }`}
                    />
                    <div className="text-sm font-medium">{label}</div>
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-[26px] border-2 border-dashed border-slate-200 bg-slate-50 p-6 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm">
                <Camera className="h-6 w-6 text-slate-700" />
              </div>
              <div className="font-medium">Capturar foto da ameaça</div>
              <div className="mt-1 text-xs text-slate-500">
                Imagem com geotag fortalece a confiança do registro.
              </div>
            </div>
            <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
              Praia do Sonho · geolocalização confirmada
            </div>
            <div className="min-h-24 rounded-2xl border border-slate-200 p-4 text-sm text-slate-500">
              Descreva a pressão costeira observada.
            </div>
          </CardContent>
        </Card>
        <Button className="h-12 w-full rounded-2xl bg-cyan-700 hover:bg-cyan-800">
          Publicar ameaça
        </Button>
      </div>
    </PhoneShell>
  );
}

function CleanupSessionScreen() {
  return (
    <PhoneShell>
      <Header
        title="Sessão de limpeza"
        subtitle="Modo rápido ou estruturado para registrar a coleta."
        back
      />
      <div className="px-4 py-4 pb-24 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Card className="rounded-3xl border-0 shadow-sm ring-1 ring-cyan-100">
            <CardContent className="p-4">
              <div className="font-medium">Modo rápido</div>
              <div className="mt-1 text-xs text-slate-500">
                Peso total, tempo, participantes e fotos.
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-3xl border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="font-medium">Modo científico</div>
              <div className="mt-1 text-xs text-slate-500">
                Item por item, material, categoria e contagem.
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-3xl border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Resumo da coleta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="text-xs text-slate-500">Peso total</div>
                <div className="mt-1 font-semibold">128 kg</div>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="text-xs text-slate-500">Voluntários</div>
                <div className="mt-1 font-semibold">24</div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="rounded-2xl bg-slate-50 p-3 text-center">
                Plástico
                <br />
                62%
              </div>
              <div className="rounded-2xl bg-slate-50 p-3 text-center">
                Vidro
                <br />
                14%
              </div>
              <div className="rounded-2xl bg-slate-50 p-3 text-center">
                Metal
                <br />
                9%
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Itens estruturados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              ["Garrafas PET", "42 itens"],
              ["Bitucas", "120 itens"],
              ["Fragmentos plásticos", "alto volume"],
            ].map(([item, count]) => (
              <div
                key={item}
                className="rounded-2xl bg-slate-50 px-3 py-3 flex items-center justify-between"
              >
                <span className="text-sm text-slate-700">{item}</span>
                <span className="text-xs text-slate-500">{count}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Button className="h-12 w-full rounded-2xl bg-cyan-700 hover:bg-cyan-800">
          Publicar resultado
        </Button>
      </div>
    </PhoneShell>
  );
}

const componentMap = {
  Onboarding: OnboardingScreen,
  Login: LoginScreen,
  Home: HomeScreen,
  "Mapa do Oceano": OceanMapScreen,
  Radar: RadarScreen,
  Favoritos: FavoritesScreen,
  Pico: SpotScreen,
  "Timeline do Pico": SpotTimelineScreen,
  "Ameaças costeiras": ThreatsScreen,
  "Registro de ameaça": ThreatReportScreen,
  Registrar: RegisterScreen,
  "Registro ambiental": EnvReportScreen,
  Mutirões: CleanupsScreen,
  Evento: EventScreen,
  "Sessão de limpeza": CleanupSessionScreen,
  Ciência: ScienceScreen,
  Feed: FeedScreen,
  Impacto: ImpactScreen,
  Notificações: NotificationsScreen,
  Perfil: ProfileScreen,
  Admin: AdminScreen,
};

export default function EcosurfAppMobileModels() {
  const [selected, setSelected] = useState("Home");
  const SelectedComponent = useMemo(() => componentMap[selected], [selected]);

  return (
    <div className="min-h-screen bg-slate-100 p-6 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 grid gap-4 md:grid-cols-[320px,1fr]">
          <Card className="rounded-[28px] border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl">
                Ecosurf.app · modelos visuais mobile
              </CardTitle>
              <p className="text-sm leading-6 text-slate-500">
                Sistema visual para um app de cultura oceânica, surf, ciência cidadã, mobilização social e conservação do Oceano com navegação mobile-first.
              </p>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Telas
                </div>
                <div className="grid gap-2">
                  {screens.map((item) => (
                    <button
                      key={item}
                      onClick={() => setSelected(item)}
                      className={`rounded-2xl px-4 py-3 text-left text-sm transition ${
                        selected === item
                          ? "bg-cyan-700 text-white shadow"
                          : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                <div className="font-medium text-slate-900">Direção de design</div>
                <ul className="mt-2 space-y-2 list-disc pl-5">
                  <li>hierarquia clara para uso intenso no celular</li>
                  <li>surf como porta de entrada e conservação como jornada contínua</li>
                  <li>mapa, radar e mutirões como eixos centrais</li>
                  <li>dados e comunidade sem poluição visual</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <motion.div
            key={selected}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24 }}
            className="flex items-center justify-center"
          >
            <SelectedComponent />
          </motion.div>
        </div>
      </div>
    </div>
  );
}
