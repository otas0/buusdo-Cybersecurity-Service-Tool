/**
 * Fill desktopInstallStep* (+ title) and privacyDesktopOfflineNote / extensionStoreOnlyNote
 * into every i18n/packs/*.json (EN fallback unless a locale translation is listed).
 *
 *   node scripts/fill-desktop-install-step-packs.mjs
 */

import fs from "node:fs";
import path from "node:path";

const root = path.resolve(".");
const packsDir = path.join(root, "i18n/packs");

const EN = {
  desktopInstallStepsTitle: "Install in three steps",
  desktopInstallStep1: "Download the package for your system (Windows, macOS, or Linux).",
  desktopInstallStep2:
    "Open or install it. If the OS warns that the publisher is unknown, follow the setup guide once.",
  desktopInstallStep3:
    "Launch the app — the dashboard opens on this computer. Updates install the same way when the app asks.",
  privacyDesktopOfflineNote:
    "Desktop app: computer scan and personal block lists work offline. Live website address checks need the internet when you use that path.",
  extensionStoreOnlyNote:
    "The browser extension installs from the Chrome Web Store or Mac App Store only. There is no whole-repo download and no offline self-contained extension package."
};

/** @type {Record<string, Partial<typeof EN>>} */
const LOCAL = {
  "zh-Hans": {
    desktopInstallStepsTitle: "三步安装",
    desktopInstallStep1: "下载适用于您系统的安装包（Windows、macOS 或 Linux）。",
    desktopInstallStep2: "打开或安装。若系统提示未知发布者，请按安装指南操作一次。",
    desktopInstallStep3: "启动应用 — 仪表板在本机打开。需要更新时按同样方式安装。",
    privacyDesktopOfflineNote:
      "桌面应用：本机扫描与个人拦截列表可离线使用。网站地址检查在走该路径时需要联网。",
    extensionStoreOnlyNote:
      "浏览器扩展仅通过 Chrome 网上应用店或 Mac App Store 安装。不提供整库下载，也没有离线自包含扩展包。"
  },
  "zh-Hant": {
    desktopInstallStepsTitle: "三步安裝",
    desktopInstallStep1: "下載適用於您系統的安裝包（Windows、macOS 或 Linux）。",
    desktopInstallStep2: "開啟或安裝。若系統提示未知發行者，請依安裝指南操作一次。",
    desktopInstallStep3: "啟動應用 — 儀表板在本機開啟。需要更新時以同樣方式安裝。",
    privacyDesktopOfflineNote:
      "桌面應用：本機掃描與個人攔截列表可離線使用。網站地址檢查在走該路徑時需要連網。",
    extensionStoreOnlyNote:
      "瀏覽器擴充功能僅透過 Chrome 線上應用程式商店或 Mac App Store 安裝。不提供整庫下載，也沒有離線自包含擴充包。"
  },
  ja: {
    desktopInstallStepsTitle: "3 ステップでインストール",
    desktopInstallStep1: "お使いの OS 用パッケージをダウンロード（Windows / macOS / Linux）。",
    desktopInstallStep2: "開く／インストール。発行元不明の警告が出たらセットアップガイドに一度従ってください。",
    desktopInstallStep3: "アプリを起動 — ダッシュボードがこのパソコンで開きます。更新も同じ流れです。",
    privacyDesktopOfflineNote:
      "デスクトップ：このパソコンのスキャンと個人ブロックリストはオフラインで動作します。サイトのアドレス確認はその経路ではインターネットが必要です。",
    extensionStoreOnlyNote:
      "ブラウザー拡張は Chrome ウェブストアまたは Mac App Store からのみインストールします。リポジトリ一式のダウンロードやオフライン完結の拡張パッケージはありません。"
  },
  de: {
    desktopInstallStepsTitle: "In drei Schritten installieren",
    desktopInstallStep1: "Laden Sie das Paket für Ihr System (Windows, macOS oder Linux).",
    desktopInstallStep2:
      "Öffnen oder installieren. Warnt das OS vor einem unbekannten Herausgeber, folgen Sie einmal der Einrichtungsanleitung.",
    desktopInstallStep3:
      "App starten — das Dashboard öffnet sich auf diesem Computer. Updates installieren sich auf demselben Weg.",
    privacyDesktopOfflineNote:
      "Desktop-App: Computerscan und persönliche Blocklisten funktionieren offline. Live-Adressprüfungen auf der Website brauchen Internet, wenn Sie diesen Weg nutzen.",
    extensionStoreOnlyNote:
      "Die Browser-Erweiterung wird nur über den Chrome Web Store oder den Mac App Store installiert. Es gibt keinen Gesamt-Repo-Download und kein offline-autarkes Erweiterungs-Paket."
  },
  fr: {
    desktopInstallStepsTitle: "Installer en trois étapes",
    desktopInstallStep1: "Téléchargez le paquet pour votre système (Windows, macOS ou Linux).",
    desktopInstallStep2:
      "Ouvrez ou installez. Si le système signale un éditeur inconnu, suivez une fois le guide d’installation.",
    desktopInstallStep3:
      "Lancez l’app — le tableau de bord s’ouvre sur cet ordinateur. Les mises à jour s’installent de la même façon.",
    privacyDesktopOfflineNote:
      "App bureau : l’analyse de cet ordinateur et les listes de blocage personnelles fonctionnent hors ligne. Les vérifications d’adresse sur le site nécessitent Internet sur ce chemin.",
    extensionStoreOnlyNote:
      "L’extension navigateur s’installe uniquement depuis le Chrome Web Store ou le Mac App Store. Pas de téléchargement du dépôt entier ni de paquet d’extension autonome hors ligne."
  },
  es: {
    desktopInstallStepsTitle: "Instalar en tres pasos",
    desktopInstallStep1: "Descargue el paquete de su sistema (Windows, macOS o Linux).",
    desktopInstallStep2:
      "Ábralo o instálelo. Si el SO avisa de editor desconocido, siga la guía de instalación una vez.",
    desktopInstallStep3:
      "Abra la app — el panel se abre en este ordenador. Las actualizaciones se instalan igual cuando lo pida.",
    privacyDesktopOfflineNote:
      "App de escritorio: el análisis de este ordenador y las listas personales de bloqueo funcionan sin conexión. Las comprobaciones de dirección en el sitio necesitan internet en ese camino.",
    extensionStoreOnlyNote:
      "La extensión del navegador solo se instala desde Chrome Web Store o Mac App Store. No hay descarga del repositorio completo ni paquete offline autónomo de la extensión."
  },
  it: {
    desktopInstallStepsTitle: "Installa in tre passi",
    desktopInstallStep1: "Scarica il pacchetto per il tuo sistema (Windows, macOS o Linux).",
    desktopInstallStep2:
      "Apri o installa. Se il sistema avvisa di editore sconosciuto, segui una volta la guida di installazione.",
    desktopInstallStep3:
      "Avvia l’app — la dashboard si apre su questo computer. Gli aggiornamenti si installano allo stesso modo.",
    privacyDesktopOfflineNote:
      "App desktop: scansione di questo computer e liste di blocco personali funzionano offline. I controlli indirizzo sul sito richiedono internet su quel percorso.",
    extensionStoreOnlyNote:
      "L’estensione del browser si installa solo da Chrome Web Store o Mac App Store. Non c’è download dell’intero repository né un pacchetto estensione autonomo offline."
  },
  nl: {
    desktopInstallStepsTitle: "In drie stappen installeren",
    desktopInstallStep1: "Download het pakket voor uw systeem (Windows, macOS of Linux).",
    desktopInstallStep2:
      "Open of installeer. Waarschuwt het OS voor een onbekende uitgever, volg één keer de installatiegids.",
    desktopInstallStep3:
      "Start de app — het dashboard opent op deze computer. Updates installeren op dezelfde manier.",
    privacyDesktopOfflineNote:
      "Desktop-app: computerscan en persoonlijke blokkeerlijsten werken offline. Live adrescontroles op de site hebben internet nodig op dat pad.",
    extensionStoreOnlyNote:
      "De browserextensie installeert u alleen via de Chrome Web Store of Mac App Store. Geen volledige-repo-download en geen offline zelfstandig extensiepakket."
  },
  sv: {
    desktopInstallStepsTitle: "Installera i tre steg",
    desktopInstallStep1: "Ladda ner paketet för ditt system (Windows, macOS eller Linux).",
    desktopInstallStep2:
      "Öppna eller installera. Om OS varnar för okänd utgivare, följ installationsguiden en gång.",
    desktopInstallStep3:
      "Starta appen — instrumentpanelen öppnas på den här datorn. Uppdateringar installeras på samma sätt.",
    privacyDesktopOfflineNote:
      "Skrivbordsappen: datorscan och personliga blocklistor fungerar offline. Adresskontroller på webbplatsen behöver internet på den vägen.",
    extensionStoreOnlyNote:
      "Webbläsartillägget installeras endast från Chrome Web Store eller Mac App Store. Ingen hel-repo-nedladdning och inget offline fristående tilläggspaket."
  },
  da: {
    desktopInstallStepsTitle: "Installer i tre trin",
    desktopInstallStep1: "Download pakken til dit system (Windows, macOS eller Linux).",
    desktopInstallStep2:
      "Åbn eller installer. Hvis OS advarer om ukendt udgiver, følg installationsvejledningen én gang.",
    desktopInstallStep3:
      "Start appen — dashboardet åbner på denne computer. Opdateringer installeres på samme måde.",
    privacyDesktopOfflineNote:
      "Skrivebordsapp: computerscan og personlige blokeringslister virker offline. Adressekontrol på websitet kræver internet på den sti.",
    extensionStoreOnlyNote:
      "Browserudvidelsen installeres kun fra Chrome Web Store eller Mac App Store. Ingen hele-repo-download og ingen offline selvstændig udvidelsespakke."
  },
  fi: {
    desktopInstallStepsTitle: "Asenna kolmessa vaiheessa",
    desktopInstallStep1: "Lataa paketti järjestelmällesi (Windows, macOS tai Linux).",
    desktopInstallStep2:
      "Avaa tai asenna. Jos käyttöjärjestelmä varoittaa tuntemattomasta julkaisijasta, noudata asennusopasta kerran.",
    desktopInstallStep3:
      "Käynnistä sovellus — kojelauta avautuu tällä tietokoneella. Päivitykset asennetaan samalla tavalla.",
    privacyDesktopOfflineNote:
      "Työpöytäsovellus: tämän tietokoneen skannaus ja henkilökohtaiset estolistat toimivat offline. Sivuston osoitetarkistukset tarvitsevat internetin sillä polulla.",
    extensionStoreOnlyNote:
      "Selainlaajennus asennetaan vain Chrome Web Storesta tai Mac App Storesta. Ei koko repon latausta eikä offline-itsenäistä laajennuspakettia."
  },
  nb: {
    desktopInstallStepsTitle: "Installer i tre trinn",
    desktopInstallStep1: "Last ned pakken for systemet ditt (Windows, macOS eller Linux).",
    desktopInstallStep2:
      "Åpne eller installer. Hvis OS advarer om ukjent utgiver, følg installasjonsveiledningen én gang.",
    desktopInstallStep3:
      "Start appen — dashbordet åpnes på denne datamaskinen. Oppdateringer installeres på samme måte.",
    privacyDesktopOfflineNote:
      "Skrivebordsappen: datascan og personlige blokkeringslister fungerer offline. Adressesjekker på nettstedet trenger internett på den stien.",
    extensionStoreOnlyNote:
      "Nettleserutvidelsen installeres kun fra Chrome Web Store eller Mac App Store. Ingen hele-repo-nedlasting og ingen offline selvstendig utvidelsespakke."
  },
  "pt-BR": {
    desktopInstallStepsTitle: "Instalar em três passos",
    desktopInstallStep1: "Descarregue o pacote do seu sistema (Windows, macOS ou Linux).",
    desktopInstallStep2:
      "Abra ou instale. Se o sistema avisar de editor desconhecido, siga o guia de instalação uma vez.",
    desktopInstallStep3:
      "Abra a app — o painel abre neste computador. As atualizações instalam-se da mesma forma quando a app pedir.",
    privacyDesktopOfflineNote:
      "App desktop: a análise deste computador e as listas pessoais de bloqueio funcionam offline. As verificações de endereço no site precisam de internet quando usar esse caminho.",
    extensionStoreOnlyNote:
      "A extensão do navegador instala-se apenas na Chrome Web Store ou na Mac App Store. Não há descarga do repositório completo nem pacote offline autónomo da extensão."
  }
};

const keys = Object.keys(EN);
let updated = 0;
for (const file of fs.readdirSync(packsDir).filter((f) => f.endsWith(".json"))) {
  const id = file.replace(/\.json$/, "");
  const p = path.join(packsDir, file);
  const pack = JSON.parse(fs.readFileSync(p, "utf8"));
  const loc = LOCAL[id] || {};
  let changed = false;
  for (const key of keys) {
    const next = loc[key] || EN[key];
    if (pack[key] !== next) {
      pack[key] = next;
      changed = true;
    }
  }
  if (changed) {
    fs.writeFileSync(p, `${JSON.stringify(pack, null, 2)}\n`);
    updated += 1;
  }
}
console.log(`[fill-desktop-install-steps] updated ${updated} packs`);
