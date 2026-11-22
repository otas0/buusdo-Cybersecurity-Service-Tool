/**
 * Fill faqExtOffline* for CE/SE Europe packs + extensionStoreOnlyNote for
 * remaining must-stay-full locales (non-EN).
 *
 *   node scripts/fill-ce-faq-ext-and-store-only.mjs
 */

import fs from "node:fs";
import path from "node:path";

const packsDir = path.join("i18n/packs");
const mustStay = JSON.parse(
  fs.readFileSync("i18n/must-stay-full-locales.json", "utf8")
);
const enStore =
  "The browser extension installs from the Chrome Web Store or Mac App Store only. There is no whole-repo download and no offline self-contained extension package.";

const FAQ = {
  pl: {
    faqExtOfflineTitle:
      "Czy mogę zainstalować rozszerzenie przeglądarki jako kompletny pakiet offline?",
    faqExtOfflineBody:
      "Nie. Rozszerzenie instaluje się tylko z Chrome Web Store lub Mac App Store. Nie ma pobierania całego repozytorium ani samodzielnego pakietu offline — zobacz Downloads."
  },
  cs: {
    faqExtOfflineTitle:
      "Mohu nainstalovat rozšíření prohlížeče jako kompletní offline balíček?",
    faqExtOfflineBody:
      "Ne. Rozšíření se instaluje jen z Chrome Web Store nebo Mac App Store. Neexistuje stažení celého repozitáře ani samostatný offline balíček — viz Downloads."
  },
  sk: {
    faqExtOfflineTitle:
      "Môžem nainštalovať rozšírenie prehliadača ako kompletný offline balík?",
    faqExtOfflineBody:
      "Nie. Rozšírenie sa inštaluje len z Chrome Web Store alebo Mac App Store. Neexistuje stiahnutie celého repozitára ani samostatný offline balík — pozrite Downloads."
  },
  hu: {
    faqExtOfflineTitle: "Telepíthetem a böngésző-bővítményt teljes offline csomagként?",
    faqExtOfflineBody:
      "Nem. A bővítmény csak a Chrome Web Store-ból vagy a Mac App Store-ból telepíthető. Nincs teljes repo letöltés, sem önálló offline csomag — lásd Downloads."
  },
  ro: {
    faqExtOfflineTitle: "Pot instala extensia de browser ca pachet offline complet?",
    faqExtOfflineBody:
      "Nu. Extensia se instalează doar din Chrome Web Store sau Mac App Store. Nu există descărcarea întregului depozit și nici un pachet offline autonom — vezi Downloads."
  },
  bg: {
    faqExtOfflineTitle:
      "Мога ли да инсталирам разширението за браузър като пълен офлайн пакет?",
    faqExtOfflineBody:
      "Не. Разширението се инсталира само от Chrome Web Store или Mac App Store. Няма изтегляне на цялото хранилище, нито самостоятелен офлайн пакет — вижте Downloads."
  },
  hr: {
    faqExtOfflineTitle:
      "Mogu li instalirati proširenje preglednika kao cjeloviti offline paket?",
    faqExtOfflineBody:
      "Ne. Proširenje se instalira samo iz Chrome Web Storea ili Mac App Storea. Nema preuzimanja cijelog repozitorija ni samostalnog offline paketa — vidi Downloads."
  },
  sl: {
    faqExtOfflineTitle:
      "Ali lahko namestim razširitev brskalnika kot celovit paket brez povezave?",
    faqExtOfflineBody:
      "Ne. Razširitev se namesti le iz Chrome Web Store ali Mac App Store. Ni prenosa celotnega repozitorija niti samostojnega paketa brez povezave — glej Downloads."
  },
  lt: {
    faqExtOfflineTitle:
      "Ar galiu įdiegti naršyklės plėtinį kaip visą neprisijungusį paketą?",
    faqExtOfflineBody:
      "Ne. Plėtinys diegiamas tik iš Chrome Web Store arba Mac App Store. Nėra viso saugyklos atsisiuntimo ir nėra savarankiško neprisijungusio paketo — žr. Downloads."
  },
  lv: {
    faqExtOfflineTitle:
      "Vai es varu instalēt pārlūkprogrammas paplašinājumu kā pilnu bezsaistes pakotni?",
    faqExtOfflineBody:
      "Nē. Paplašinājums tiek instalēts tikai no Chrome Web Store vai Mac App Store. Nav visas krātuves lejupielādes un nav autonomas bezsaistes pakotnes — skat. Downloads."
  },
  et: {
    faqExtOfflineTitle:
      "Kas saan brauserilaiendust paigaldada täieliku võrguühenduseta paketina?",
    faqExtOfflineBody:
      "Ei. Laiendus paigaldatakse ainult Chrome Web Store’ist või Mac App Store’ist. Terve repo allalaadimist ega iseseisvat võrguühenduseta paketti pole — vt Downloads."
  },
  el: {
    faqExtOfflineTitle:
      "Μπορώ να εγκαταστήσω την επέκταση προγράμματος περιήγησης ως πλήρες πακέτο εκτός σύνδεσης;",
    faqExtOfflineBody:
      "Όχι. Η επέκταση εγκαθίσταται μόνο από το Chrome Web Store ή το Mac App Store. Δεν υπάρχει λήψη ολόκληρου αποθετηρίου ούτε αυτόνομο πακέτο εκτός σύνδεσης — δείτε Downloads."
  },
  uk: {
    faqExtOfflineTitle: "Чи можу я встановити розширення браузера як повний офлайн-пакет?",
    faqExtOfflineBody:
      "Ні. Розширення встановлюється лише з Chrome Web Store або Mac App Store. Немає завантаження всього репозиторію й автономного офлайн-пакета — див. Downloads."
  },
  is: {
    faqExtOfflineTitle:
      "Get ég sett upp vafraviðbótina sem heildar pakka án nettengingar?",
    faqExtOfflineBody:
      "Nei. Viðbótin er aðeins sett upp úr Chrome Web Store eða Mac App Store. Engin heildarrepo-niðurhal og enginn sjálfstæður pakki án nettengingar — sjá Downloads."
  },
  ca: {
    faqExtOfflineTitle:
      "Puc instal·lar l’extensió del navegador com a paquet fora de línia complet?",
    faqExtOfflineBody:
      "No. L’extensió només s’instal·la des de Chrome Web Store o Mac App Store. No hi ha baixada del repositori sencer ni paquet autònom fora de línia — vegeu Downloads."
  },
  ga: {
    faqExtOfflineTitle:
      "An féidir liom an eisínteacht brabhsálaí a shuiteáil mar phacáiste iomlán as líne?",
    faqExtOfflineBody:
      "Ní féidir. Suiteáiltear an eisínteacht ó Chrome Web Store nó Mac App Store amháin. Níl íoslódáil an stórais iomláin ann ná pacáiste neamhspleách as líne — féach Downloads."
  },
  mt: {
    faqExtOfflineTitle: "Nista’ ninstalla l-estensjoni tal-browser bħala pakkett offline sħiħ?",
    faqExtOfflineBody:
      "Le. L-estensjoni tiġi installata biss mill-Chrome Web Store jew Mac App Store. M’hemmx download tar-repo kollu u lanqas pakkett offline awtonomu — ara Downloads."
  }
};

const STORE = {
  pl: "Rozszerzenie przeglądarki instaluje się tylko z Chrome Web Store lub Mac App Store. Nie ma pobierania całego repozytorium ani samodzielnego pakietu offline.",
  cs: "Rozšíření prohlížeče se instaluje jen z Chrome Web Store nebo Mac App Store. Neexistuje stažení celého repozitáře ani samostatný offline balíček.",
  sk: "Rozšírenie prehliadača sa inštaluje len z Chrome Web Store alebo Mac App Store. Neexistuje stiahnutie celého repozitára ani samostatný offline balík.",
  hu: "A böngésző-bővítmény csak a Chrome Web Store-ból vagy a Mac App Store-ból telepíthető. Nincs teljes repo letöltés, sem önálló offline csomag.",
  ro: "Extensia de browser se instalează doar din Chrome Web Store sau Mac App Store. Nu există descărcarea întregului depozit și nici un pachet offline autonom.",
  bg: "Разширението за браузър се инсталира само от Chrome Web Store или Mac App Store. Няма изтегляне на цялото хранилище, нито самостоятелен офлайн пакет.",
  hr: "Proširenje preglednika instalira se samo iz Chrome Web Storea ili Mac App Storea. Nema preuzimanja cijelog repozitorija ni samostalnog offline paketa.",
  sl: "Razširitev brskalnika se namesti le iz Chrome Web Store ali Mac App Store. Ni prenosa celotnega repozitorija niti samostojnega paketa brez povezave.",
  lt: "Naršyklės plėtinys diegiamas tik iš Chrome Web Store arba Mac App Store. Nėra viso saugyklos atsisiuntimo ir nėra savarankiško neprisijungusio paketo.",
  lv: "Pārlūkprogrammas paplašinājums tiek instalēts tikai no Chrome Web Store vai Mac App Store. Nav visas krātuves lejupielādes un nav autonomas bezsaistes pakotnes.",
  et: "Brauserilaiendus paigaldatakse ainult Chrome Web Store’ist või Mac App Store’ist. Terve repo allalaadimist ega iseseisvat võrguühenduseta paketti pole.",
  el: "Η επέκταση προγράμματος περιήγησης εγκαθίσταται μόνο από το Chrome Web Store ή το Mac App Store. Δεν υπάρχει λήψη ολόκληρου αποθετηρίου ούτε αυτόνομο πακέτο εκτός σύνδεσης.",
  uk: "Розширення браузера встановлюється лише з Chrome Web Store або Mac App Store. Немає завантаження всього репозиторію й автономного офлайн-пакета.",
  is: "Vafraviðbótin er aðeins sett upp úr Chrome Web Store eða Mac App Store. Engin heildarrepo-niðurhal og enginn sjálfstæður pakki án nettengingar.",
  ca: "L’extensió del navegador només s’instal·la des de Chrome Web Store o Mac App Store. No hi ha baixada del repositori sencer ni paquet autònom fora de línia.",
  ga: "Suiteáiltear an eisínteacht brabhsálaí ó Chrome Web Store nó Mac App Store amháin. Níl íoslódáil an stórais iomláin ann ná pacáiste neamhspleách as líne.",
  mt: "L-estensjoni tal-browser tiġi installata biss mill-Chrome Web Store jew Mac App Store. M’hemmx download tar-repo kollu u lanqas pakkett offline awtonomu.",
  af: "Die blaaieruitbreiding installeer slegs vanaf die Chrome Web Store of Mac App Store. Daar is geen heel-repo-aflaai en geen vanlyn selfstandige uitbreidingspakket nie.",
  zu: "Isandiso sesiphequluli sifakwa kuphela ku-Chrome Web Store noma ku-Mac App Store. Akukho ukulanda kwenqolobane yonke futhi akukho iphakheji engaxhunyiwe ezimele.",
  xh: "Isandiso sesikhangeli sifakwa kuphela kwi-Chrome Web Store okanye kwi-Mac App Store. Akukho ukukhuphela kwenqolobane yonke kwaye akukho iphakheji engaxhunyiwe ezimeleyo.",
  nso: "Koketšo ya sebatli e tsenywa fela go tšwa go Chrome Web Store goba Mac App Store. Ga go na go laolla repo ka moka le ga go na sephuthelwana sa offline se ikemetseng.",
  st: "Koketso ea sebatli e kenngoa feela ho tsoa ho Chrome Web Store kapa Mac App Store. Ha ho na ho jarolla repo eohle le ha ho na sephuthelwana sa offline se ikemetseng.",
  tn: "Koketso ya sebatli e tsenngwa fela go tswa go Chrome Web Store kgotsa Mac App Store. Ga go na go laolla repo yotlhe le ga go na sephuthelwana sa offline se ikemetseng.",
  ss: "Sengehto sesiphequluli sifakwa kuphela ku-Chrome Web Store noma ku-Mac App Store. Akukho kukhandla kwenqolobane yonke futsi akukho liphakheji lelingaxhunyiwe lelizimele.",
  ve: "U engedzedza ha burauza hu longelwa fhedzi u bva kha Chrome Web Store kana Mac App Store. A huna u dzhia repo yoṱhe na a huna phakhethe ya offline i ḓiimaho.",
  ts: "Xiengeteri xa bhurawuza xi nghenisiwa ntsena ku suka eka Chrome Web Store kumbe Mac App Store. A ku na ku koka repo hinkwayo naswona a ku na phakheji ya offline leyi tiyimeleke.",
  nr: "Isengezo sesiphequluli sifakwa kuphela ku-Chrome Web Store nanyana ku-Mac App Store. Akukho ukulanda kwenqolobane yonke futhi akukho iphakheji engaxhunyiwe ezimele.",
  mi: "Ka tāutahia te toronga pūtirotiro mai i te Chrome Web Store, Mac App Store rānei anake. Kāore he tikiake katoa o te pūtākī, kāore hoki he mōkihi motuhake ā-ipurangi.",
  id: "Ekstensi peramban hanya dipasang dari Chrome Web Store atau Mac App Store. Tidak ada unduhan seluruh repositori dan tidak ada paket ekstensi mandiri luring.",
  ms: "Sambungan pelayar hanya dipasang dari Chrome Web Store atau Mac App Store. Tiada muat turun keseluruhan repositori dan tiada pakej sambungan luar talian yang berdiri sendiri.",
  th: "ส่วนขยายเบราว์เซอร์ติดตั้งได้จาก Chrome Web Store หรือ Mac App Store เท่านั้น ไม่มีการดาวน์โหลดทั้งคลัง และไม่มีแพ็กเกจออฟไลน์แบบครบในตัว",
  vi: "Tiện ích trình duyệt chỉ cài từ Chrome Web Store hoặc Mac App Store. Không có tải toàn bộ kho mã và không có gói tiện ích ngoại tuyến độc lập.",
  fil: "Ang extension ng browser ay ini-install lamang mula sa Chrome Web Store o Mac App Store. Walang buong-repo download at walang offline na self-contained na extension package.",
  km: "ផ្នែកបន្ថែមកម្មវិធីរុករកត្រូវបានដំឡើងតែពី Chrome Web Store ឬ Mac App Store ប៉ុណ្ណោះ។ មិនមានការទាញយក repo ទាំងមូល និងគ្មានកញ្ចប់ផ្នែកបន្ថែម Offline ដាច់ដោយឡែកទេ។",
  lo: "ສ່ວນຂະຫຍາຍບຣາວເຊີຕິດຕັ້ງໄດ້ຈາກ Chrome Web Store ຫຼື Mac App Store ເທົ່ານັ້ນ. ບໍ່ມີການດາວໂຫຼດ repo ທັງໝົດ ແລະບໍ່ມີແພັກເກັດ Offline ແບບຄົບໃນຕົວ.",
  my: "ဘရောက်ဇာ တိုးချဲ့မှုကို Chrome Web Store သို့မဟုတ် Mac App Store မှသာ ထည့်သွင်းသည်။ repo အားလုံး ဒေါင်းလုဒ် မရှိသလို အော့ဖ်လိုင်း ကိုယ်ပိုင် တိုးချဲ့အထုပ်လည်း မရှိပါ။"
};

let updated = 0;
for (const id of mustStay) {
  const p = path.join(packsDir, `${id}.json`);
  if (!fs.existsSync(p)) continue;
  const pack = JSON.parse(fs.readFileSync(p, "utf8"));
  let changed = false;
  if (FAQ[id]) {
    for (const [k, v] of Object.entries(FAQ[id])) {
      if (pack[k] !== v) {
        pack[k] = v;
        changed = true;
      }
    }
  }
  if (STORE[id] && pack.extensionStoreOnlyNote !== STORE[id]) {
    pack.extensionStoreOnlyNote = STORE[id];
    changed = true;
  }
  if (changed) {
    fs.writeFileSync(p, `${JSON.stringify(pack, null, 2)}\n`);
    updated += 1;
  }
}

const still = [];
for (const id of mustStay) {
  const p = path.join(packsDir, `${id}.json`);
  if (!fs.existsSync(p)) continue;
  const pack = JSON.parse(fs.readFileSync(p, "utf8"));
  if ((pack.extensionStoreOnlyNote || "").trim() === enStore) still.push(id);
}
console.log(`[fill-ce-faq-store] updated ${updated}; still-EN store-only: ${still.join(",") || "none"}`);
if (still.length) process.exit(1);
