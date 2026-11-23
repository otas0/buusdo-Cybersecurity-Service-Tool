/**
 * Patch STRINGS bags (zh-Hant + Europe/Nordic overlays + ja) with
 * forceUpdate* / honestLimitsItemOffline / optionalUpdate* / updateCheckOffline.
 * Preserved across sync-desktop (not in MAP).
 *
 *   node scripts/patch-desktop-update-overlay-i18n.mjs
 */

import fs from "node:fs";
import path from "node:path";

const root = path.resolve(".");
const i18nPath = path.join(root, "desktop-app/public/js/i18n.js");

/** @type {Record<string, Record<string, string>>} */
const PATCH = {
  "zh-Hant": {
    honestLimitsItemOffline:
      "本機掃描與個人攔截列表可離線使用。網站地址檢查在走該路徑時需要連網。",
    updateCheckOffline: "離線 — 稍後再檢查更新。",
    updateCheckAvailable: "有較新的桌面套件可用（{tag}）。目前為 {version}。",
    forceUpdateKicker: "必須更新",
    forceUpdateTitle: "請安裝新的桌面套件",
    forceUpdateBody:
      "此副本（{version}）低於最低支援版本（{min}）。請下載發行 {tag}，安裝後重新開啟應用。",
    forceUpdateDownload: "下載更新",
    forceUpdateAfterDownload: "下載完成後：安裝或取代舊應用，然後開啟新副本。此視窗可保持開啟。",
    forceUpdateSetupGuide: "安裝指南",
    optionalUpdateBanner: "有較新的桌面套件可用（{tag}）。目前為 {version}。",
    optionalUpdateDismiss: "關閉",
    optionalUpdateShowHint: "顯示更新提示",
    honestLimitsMinSupportedNote: "最低支援版本：{min} · 來源 {source}"
  },
  ja: {
    honestLimitsItemOffline:
      "このパソコンのスキャンと個人ブロックリストはオフラインで動作します。サイトのアドレス確認はその経路ではインターネットが必要です。",
    updateCheckOffline: "オフライン — 後で更新を確認してください。",
    updateCheckAvailable: "新しいデスクトップパッケージがあります（{tag}）。現在は {version}。",
    forceUpdateKicker: "更新が必要です",
    forceUpdateTitle: "新しいデスクトップパッケージをインストール",
    forceUpdateBody:
      "このコピー（{version}）は最低サポート版（{min}）未満です。リリース {tag} をダウンロードしてインストールし、アプリを開き直してください。",
    forceUpdateDownload: "更新をダウンロード",
    forceUpdateAfterDownload:
      "ダウンロード後：古いアプリをインストール／置き換え、新しいコピーを開いてください。このウィンドウはそのままにして構いません。",
    forceUpdateSetupGuide: "セットアップガイド",
    optionalUpdateBanner: "新しいデスクトップパッケージがあります（{tag}）。現在は {version}。",
    optionalUpdateDismiss: "閉じる",
    optionalUpdateShowHint: "更新のヒントを表示",
    honestLimitsMinSupportedNote: "サポート下限：{min} · 出典 {source}"
  },
  de: {
    honestLimitsItemOffline:
      "Computerscan und persönliche Blocklisten funktionieren offline. Live-Adressprüfungen auf der Website brauchen Internet, wenn Sie diesen Weg nutzen.",
    updateCheckOffline: "Offline — später nach Updates suchen.",
    updateCheckAvailable: "Ein neueres Desktop-Paket ist bereit ({tag}). Sie haben {version}.",
    forceUpdateKicker: "Update erforderlich",
    forceUpdateTitle: "Neues Desktop-Paket installieren",
    forceUpdateBody:
      "Diese Kopie ({version}) liegt unter der Mindestversion ({min}). Laden Sie Release {tag}, installieren Sie es und öffnen Sie die App erneut.",
    forceUpdateDownload: "Update laden",
    forceUpdateAfterDownload:
      "Nach dem Download: installieren oder alte App ersetzen, dann die neue Kopie öffnen. Dieses Fenster kann offen bleiben.",
    forceUpdateSetupGuide: "Einrichtungsanleitung",
    optionalUpdateBanner: "Ein neueres Desktop-Paket ist bereit ({tag}). Sie haben {version}.",
    optionalUpdateDismiss: "Schließen",
    optionalUpdateShowHint: "Update-Hinweis anzeigen",
    honestLimitsMinSupportedNote: "Mindestversion: {min} · Quelle {source}"
  },
  fr: {
    honestLimitsItemOffline:
      "L’analyse de cet ordinateur et les listes de blocage personnelles fonctionnent hors ligne. Les vérifications d’adresse sur le site nécessitent Internet sur ce chemin.",
    updateCheckOffline: "Hors ligne — vérifiez les mises à jour plus tard.",
    updateCheckAvailable: "Un paquet bureau plus récent est prêt ({tag}). Vous êtes en {version}.",
    forceUpdateKicker: "Mise à jour obligatoire",
    forceUpdateTitle: "Installez le nouveau paquet bureau",
    forceUpdateBody:
      "Cette copie ({version}) est sous la version minimale ({min}). Téléchargez la release {tag}, installez-la, puis rouvrez l’app.",
    forceUpdateDownload: "Télécharger la mise à jour",
    forceUpdateAfterDownload:
      "Après le téléchargement : installez ou remplacez l’ancienne app, puis ouvrez la nouvelle copie. Cette fenêtre peut rester ouverte.",
    forceUpdateSetupGuide: "Guide d’installation",
    optionalUpdateBanner: "Un paquet bureau plus récent est prêt ({tag}). Vous êtes en {version}.",
    optionalUpdateDismiss: "Ignorer",
    optionalUpdateShowHint: "Afficher l’avis de mise à jour",
    honestLimitsMinSupportedNote: "Version minimale : {min} · source {source}"
  },
  es: {
    honestLimitsItemOffline:
      "El análisis de este ordenador y las listas personales de bloqueo funcionan sin conexión. Las comprobaciones de dirección en el sitio necesitan internet en ese camino.",
    updateCheckOffline: "Sin conexión — busque actualizaciones más tarde.",
    updateCheckAvailable: "Hay un paquete de escritorio más reciente ({tag}). Tiene la {version}.",
    forceUpdateKicker: "Actualización obligatoria",
    forceUpdateTitle: "Instale el nuevo paquete de escritorio",
    forceUpdateBody:
      "Esta copia ({version}) está por debajo de la versión mínima ({min}). Descargue la release {tag}, instálela y abra la app de nuevo.",
    forceUpdateDownload: "Descargar actualización",
    forceUpdateAfterDownload:
      "Tras la descarga: instale o sustituya la app antigua y abra la copia nueva. Esta ventana puede quedar abierta.",
    forceUpdateSetupGuide: "Guía de instalación",
    optionalUpdateBanner: "Hay un paquete de escritorio más reciente ({tag}). Tiene la {version}.",
    optionalUpdateDismiss: "Descartar",
    optionalUpdateShowHint: "Mostrar aviso de actualización",
    honestLimitsMinSupportedNote: "Versión mínima: {min} · origen {source}"
  },
  it: {
    honestLimitsItemOffline:
      "La scansione di questo computer e le liste di blocco personali funzionano offline. I controlli indirizzo sul sito richiedono internet su quel percorso.",
    updateCheckOffline: "Offline — controlla gli aggiornamenti più tardi.",
    updateCheckAvailable: "È pronto un pacchetto desktop più recente ({tag}). Hai la {version}.",
    forceUpdateKicker: "Aggiornamento obbligatorio",
    forceUpdateTitle: "Installa il nuovo pacchetto desktop",
    forceUpdateBody:
      "Questa copia ({version}) è sotto la versione minima ({min}). Scarica il release {tag}, installalo e riapri l’app.",
    forceUpdateDownload: "Scarica aggiornamento",
    forceUpdateAfterDownload:
      "Dopo il download: installa o sostituisci la vecchia app, poi apri la nuova copia. Questa finestra può restare aperta.",
    forceUpdateSetupGuide: "Guida di installazione",
    optionalUpdateBanner: "È pronto un pacchetto desktop più recente ({tag}). Hai la {version}.",
    optionalUpdateDismiss: "Ignora",
    optionalUpdateShowHint: "Mostra suggerimento aggiornamento",
    honestLimitsMinSupportedNote: "Versione minima: {min} · origine {source}"
  },
  nl: {
    honestLimitsItemOffline:
      "Computerscan en persoonlijke blokkeerlijsten werken offline. Live adrescontroles op de site hebben internet nodig op dat pad.",
    updateCheckOffline: "Offline — zoek later naar updates.",
    updateCheckAvailable: "Er is een nieuwer desktoppakket klaar ({tag}). U heeft {version}.",
    forceUpdateKicker: "Update verplicht",
    forceUpdateTitle: "Installeer het nieuwe desktoppakket",
    forceUpdateBody:
      "Deze kopie ({version}) zit onder de minimale versie ({min}). Download release {tag}, installeer en open de app opnieuw.",
    forceUpdateDownload: "Update downloaden",
    forceUpdateAfterDownload:
      "Na de download: installeer of vervang de oude app en open de nieuwe kopie. Dit venster mag open blijven.",
    forceUpdateSetupGuide: "Installatiegids",
    optionalUpdateBanner: "Er is een nieuwer desktoppakket klaar ({tag}). U heeft {version}.",
    optionalUpdateDismiss: "Sluiten",
    optionalUpdateShowHint: "Updatehint tonen",
    honestLimitsMinSupportedNote: "Minimumversie: {min} · bron {source}"
  },
  sv: {
    honestLimitsItemOffline:
      "Datorscan och personliga blocklistor fungerar offline. Adresskontroller på webbplatsen behöver internet på den vägen.",
    updateCheckOffline: "Offline — sök efter uppdateringar senare.",
    updateCheckAvailable: "Ett nyare skrivbordspaket är klart ({tag}). Du har {version}.",
    forceUpdateKicker: "Uppdatering krävs",
    forceUpdateTitle: "Installera det nya skrivbordspaketet",
    forceUpdateBody:
      "Denna kopia ({version}) ligger under minsta version ({min}). Ladda ner release {tag}, installera och öppna appen igen.",
    forceUpdateDownload: "Ladda ner uppdatering",
    forceUpdateAfterDownload:
      "Efter nedladdningen: installera eller ersätt den gamla appen, öppna sedan den nya kopian. Det här fönstret kan vara öppet.",
    forceUpdateSetupGuide: "Installationsguide",
    optionalUpdateBanner: "Ett nyare skrivbordspaket är klart ({tag}). Du har {version}.",
    optionalUpdateDismiss: "Stäng",
    optionalUpdateShowHint: "Visa uppdateringstips",
    honestLimitsMinSupportedNote: "Lägsta version: {min} · källa {source}"
  },
  da: {
    honestLimitsItemOffline:
      "Computerscan og personlige blokeringslister virker offline. Adressekontrol på websitet kræver internet på den sti.",
    updateCheckOffline: "Offline — søg efter opdateringer senere.",
    updateCheckAvailable: "En nyere skrivebordspakke er klar ({tag}). Du har {version}.",
    forceUpdateKicker: "Opdatering påkrævet",
    forceUpdateTitle: "Installer den nye skrivebordspakke",
    forceUpdateBody:
      "Denne kopi ({version}) er under minimumsversionen ({min}). Download release {tag}, installer og åbn appen igen.",
    forceUpdateDownload: "Download opdatering",
    forceUpdateAfterDownload:
      "Efter download: installer eller erstat den gamle app, og åbn den nye kopi. Dette vindue kan blive åbent.",
    forceUpdateSetupGuide: "Installationsvejledning",
    optionalUpdateBanner: "En nyere skrivebordspakke er klar ({tag}). Du har {version}.",
    optionalUpdateDismiss: "Luk",
    optionalUpdateShowHint: "Vis opdateringstip",
    honestLimitsMinSupportedNote: "Minimumversion: {min} · kilde {source}"
  },
  fi: {
    honestLimitsItemOffline:
      "Tämän tietokoneen skannaus ja henkilökohtaiset estolistat toimivat offline. Sivuston osoitetarkistukset tarvitsevat internetin sillä polulla.",
    updateCheckOffline: "Offline — tarkista päivitykset myöhemmin.",
    updateCheckAvailable: "Uudempi työpöytäpaketti on valmis ({tag}). Sinulla on {version}.",
    forceUpdateKicker: "Päivitys vaaditaan",
    forceUpdateTitle: "Asenna uusi työpöytäpaketti",
    forceUpdateBody:
      "Tämä kopio ({version}) on alle vähimmäisversion ({min}). Lataa julkaisu {tag}, asenna ja avaa sovellus uudelleen.",
    forceUpdateDownload: "Lataa päivitys",
    forceUpdateAfterDownload:
      "Latauksen jälkeen: asenna tai korvaa vanha sovellus ja avaa uusi kopio. Tämä ikkuna voi jäädä auki.",
    forceUpdateSetupGuide: "Asennusopas",
    optionalUpdateBanner: "Uudempi työpöytäpaketti on valmis ({tag}). Sinulla on {version}.",
    optionalUpdateDismiss: "Sulje",
    optionalUpdateShowHint: "Näytä päivitysvinkki",
    honestLimitsMinSupportedNote: "Vähimmäisversio: {min} · lähde {source}"
  },
  nb: {
    honestLimitsItemOffline:
      "Datascan og personlige blokkeringslister fungerer offline. Adressesjekker på nettstedet trenger internett på den stien.",
    updateCheckOffline: "Frakoblet — sjekk etter oppdateringer senere.",
    updateCheckAvailable: "En nyere skrivebordspakke er klar ({tag}). Du har {version}.",
    forceUpdateKicker: "Oppdatering påkrevd",
    forceUpdateTitle: "Installer den nye skrivebordspakken",
    forceUpdateBody:
      "Denne kopien ({version}) er under minimumsversjonen ({min}). Last ned utgivelse {tag}, installer og åpne appen på nytt.",
    forceUpdateDownload: "Last ned oppdatering",
    forceUpdateAfterDownload:
      "Etter nedlasting: installer eller erstatt den gamle appen, åpne deretter den nye kopien. Dette vinduet kan stå åpent.",
    forceUpdateSetupGuide: "Installasjonsveiledning",
    optionalUpdateBanner: "En nyere skrivebordspakke er klar ({tag}). Du har {version}.",
    optionalUpdateDismiss: "Lukk",
    optionalUpdateShowHint: "Vis oppdateringstips",
    honestLimitsMinSupportedNote: "Minimumsversjon: {min} · kilde {source}"
  }
};

let src = fs.readFileSync(i18nPath, "utf8");

for (const [id, keys] of Object.entries(PATCH)) {
  const re = new RegExp(`STRINGS\\[${JSON.stringify(id)}\\] = (\\{[\\s\\S]*?\\n\\});`);
  const m = src.match(re);
  if (!m) {
    console.error(`missing STRINGS[${id}]`);
    process.exit(1);
  }
  const bag = Function(`"use strict"; return (${m[1]});`)();
  Object.assign(bag, keys);
  const next = `STRINGS[${JSON.stringify(id)}] = ${JSON.stringify(bag, null, 2)};`;
  src = src.replace(re, () => next);
}

fs.writeFileSync(i18nPath, src);
console.log(`[patch-desktop-update-overlay] patched ${Object.keys(PATCH).join(", ")}`);
