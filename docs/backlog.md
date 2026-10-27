# Backlog: Seikkailut

Päivitetty 2026-10-27 (pm; osio E: Q45–Q47 kirjattu, SEI-54 – SEI-56 lisätty; SEI-50 – SEI-53 lisätty aiemmin samana päivänä; aiemmin SEI-49, SEI-48 ja Q31–Q33). Syöte: `docs/brief.md` ja kolme kopiota
hakemistossa `originals/`. Tämä tiedosto on pm:n tuotos; tilan (todo,
in-progress, review, verifying, done) siirtää vain pääsessio.

## Tavoite ja kenelle

Kolme olemassa olevaa lastenpeliä (Matikkaseikkailu, Sanaseikkailu,
Espanjavalmentaja) yhdistetään yhdeksi sovellukseksi, Seikkailut, joka on
monipuolisempi ja käyttökokemukseltaan selvästi parempi. Jokainen nykyinen
käyttötapaus säilyy.

Pelaajat: tarkoitettu 1.–2.-luokkalaisille. Pelaajat osaavat lukea, osa
vasta vähän aikaa; espanjaa opiskellaan 1. luokalta. Laite: tietokone tai iPad, selaimessa. Rakenne: yksi
yhteinen sovellus. Nämä kolme on omistaja päättänyt; kaikki muu tässä
tiedostossa on joko nykyisen toiminnan säilyttämistä tai ehdotus.

Ratkaistava ongelma omistajan sanoin: nykyiset pelit ovat kolme erillistä,
keskenään erilaista ja keskeneräistä kokonaisuutta; haluttu on yksi
paremmin toimiva ja monipuolisempi sovellus.

## Lähteet ja mistä luvut on otettu

Kaikki alla olevat luvut ja käyttäytymiskuvaukset on luettu näistä
tiedostoista (rivinumerot niiden nykyisestä sisällöstä, 2026-10-22):

- Matikka: `originals/matikkaseikkailu.html` (alkuperä: commit 53f88c3,
  2026-03-09). Tehtävävalinta rivit 361–406, vaikeustaso ja laskutavat
  424–444, kierroksen pituus (`MAX_QUESTIONS` = 10) rivi 302.
- Sana: `originals/sanaseikkailu.html` (alkuperä: commit 34cc5d0,
  2026-02-19). Sanalistat rivit 341–389 (24 + 20 sanaa), tavutus 409–451,
  puhe 453–523, tarkistus 686–699, voittoääni 715–729.
- Espanja: `originals/espanjavalmentaja.html` (alkuperä: paikallinen
  tiedosto, 2025-09-28). Sanalista rivit 193–214 (8 tervehdystä + 10 väriä
  = 18 sanaa), kysymys 282–293, tähdet 381–391.
- Ääni: `originals/vauhti.mp3` (Sanaseikkailun voittoääni, soi 3 s).

"Koodista luettua" -kohdat ovat lähtötasoa. Kukaan ei ole raportoinut niitä
eikä niitä ole nähty käytössä, joten niille ei anneta vakavuutta. Ne
esiintyvät tehtävissä SEI-5 – SEI-10 omistajan pyynnön "UX paljon
parempi" alla, ja kuuluvatko ne ensimmäiseen versioon, on kysymys K1.

## Järjestys ja sen peruste

Ehdotettu järjestys. Peruste EI ole vakavuus vaan:

1. Omistajan oma lause: "jokaisen use casen varmasti saat kiinni".
   Siksi ensin SEI-1 (yhteinen runko), sitten SEI-2 – SEI-4 (kolmen pelin
   nykyinen toiminta), sillä kunnes ne ovat uudessa sovelluksessa, mikään
   vanha peli ei voi jäädä pois käytöstä.
2. Riippuvuudet: runko ennen pelejä; profiilit (SEI-11) ennen kaikkea
   mikä vaatii "kuka pelaa" -tiedon (SEI-12 – SEI-16).
3. Pelien keskinäinen järjestys SEI-2 – SEI-4 on vapaa. Ehdotus: Espanja
   ensin, koska se on pienin (18 sanaa, yksi pelitapa) ja kokeilee
   yhteistä runkoa pienimmällä työllä. Tämä on vain koon perusteella.
4. Yksi asia kerrallaan: kukin tehtävä voidaan julkaista erikseen.

Ehdotus-osion (D) tehtäviä ei aloiteta ennen kuin K1 on vastattu.

## Omistajan vastaukset (2026-10-22)

Omistaja vastasi kaikkiin kolmeen "suositusten mukaan", eli oletukset
ovat voimassa (Q5–Q7 tiedostossa `docs/questions.md`).

- **K1 (Q5):** ensimmäiseen versioon vain nykyinen toiminta ja
  heikkouksien korjaus (SEI-1 – SEI-10). D-osion tehtävät tulevat sen
  jälkeen yksi kerrallaan omistajan valitsemassa järjestyksessä.
- **K2 (Q6):** kummankin lapsen edistyminen muistetaan. Lapsi valitsee
  nimensä alussa, ei salasanaa, tiedot säilyvät vain siinä laitteessa.
  Samalla vai omilla laitteilla pelataan: ei tiedossa, oletus ei kumpikaan
  ole poissuljettu. Koskee SEI-11:tä, kun se valitaan.
- **K3 (Q7):** koulun sanalistaa ei ole käytössä. Lisäaiheiden järjestys:
  numerot, eläimet, perhe, ruoka, keho, viikonpäivät, fraasit.
  Käännökset (SEI-9) tarkistetaan sanakirjasta; espanjaa osaavaa
  tarkistajaa ei ole nimetty.

## Riskit ja suunnittelutarve

- **Puhe laitteessa (ei tarkistettu).** Kaikki kolme peliä käyttävät
  selaimen omaa puhetta (suomi `fi-FI`, espanja `es-ES`). Onko iPadissa
  molemmat äänet, ei ole tarkistettu. Myös selainten rajoitus, että ääni
  vaatii ensin napautuksen, voi estää nykyisen "lue automaattisesti"
  -tavan iPadilla. Ei havaittu tässä sovelluksessa, mutta nykyiset pelit
  toistavat puheen ilman napautusta (Matikka 500 ms, Sana 550 ms
  kysymyksen latauksesta). Katetaan kriteereillä SEI-1:ssä.
- **Selaimet tarkemmin.** Omistaja sanoi "selaimessa" tietokoneella tai
  iPadilla, ei mitä selainta. Oletus: iPadin Safari ja tietokoneen
  Safari/Chrome. Tarkistettava omistajalta tarvittaessa.
- **Tallennettu edistyminen voi kadota (ei tarkistettu).** Selain voi
  tyhjentää sivuston tiedot, jos sivustoa ei käytetä pitkään, erityisesti
  iPadin Safari. Vaikuttaa tähtiin, tarroihin ja profiileihin (SEI-4,
  SEI-11, SEI-12).
- **Nykyinen julkaisu.** Vain Sanaseikkailu on julkaistu (Google Apps
  Script, GitHub Actions deployaa mainista). Sen korvaaminen uudella
  sovelluksella on oma päätöksensä. Oletus: vanhaa ei poisteta ennen kuin
  uusi on nähty toimivan; päätetään myöhemmin eikä kuulu tähän backlogiin.
- **Espanjan käännökset tarvitsevat espanjaa osaavan tarkistajan.**
  Kuka tarkistaa, on omistajan tieto (kuuluu K3:n yhteyteen).
- **Emojikuvat.** Sana ja Matikka käyttävät emojeita kuvina. Niiden ulkoasu
  vaihtelee laitteittain, ja uudet emojit (esim. 🫕 sanalle PATA) voivat
  puuttua vanhalta iPadilta. Ei tarkistettu.
- **Nimi "Eskari" Matikan tasolla.** Pelaajat ovat 1.–2. luokalla; nimeäminen
  on designerin asia (koskee SEI-2:ta).
- **Suunnittelutarve (designer):** SEI-1, SEI-2 – SEI-10 ja kaikki D-osion
  tehtävät koskevat ulkoasua tai viestejä. Designer ennen arkkitehtia.
- **Ehdotus, ei vaatimus (pm):** osa pelaajista on lukenut vasta vähän
  aikaa. Voisi harkita, että jokainen ohje ja painike voidaan myös
  kuunnella. Ei omistajan pyyntö; ei tehtävää ennen kuin omistaja sanoo.

---

# Tehtävät

Kriteerit ovat muotoa Annettu / Kun / Niin. "Nykyinen" tarkoittaa
`originals/`-kopioiden käytöstä koodista luettua; kukin kohta vastaa
yhtä nykyistä käyttötapausta, ja ne kaikki säilytetään.

## A. Yhteinen runko

### SEI-1 — Yksi sovellus: etusivu ja pelin valinta, toimii tietokoneella ja iPadilla
Tila: done
Havainto (2026-10-23): omistaja avasi https://hakaotu.github.io/seikkailut/
Macilla; sivu aukeaa ja äänet kuuluvat. iPadilla ei kokeiltu: ääni
ensimmäisestä napautuksesta iPad-Safarissa (R2, R3) on yhä tarkistamatta
ja tarkistetaan SEI-2:n yhteydessä, kun iPad on käsillä.
Perustelu: omistaja päätti yhden yhteisen sovelluksen; ilman runkoa
kolmea peliä ei voi yhdistää.
Riippuvuus: ei mitään (tämä ensin).
Kriteerit:
1. Annettu sovellus on avattu selaimessa. Kun katson etusivua. Niin siinä
   on kolme valintaa: matikka, sanat (suomi) ja espanja, ja kunkin
   napautus avaa kyseisen pelin.
2. Annettu olen pelissä. Kun palaan etusivulle. Niin pääsen valitsemaan
   toisen pelin ilman, että sivua ladataan käsin uudelleen.
3. Annettu iPad pysty- ja vaaka-asennossa sekä tietokoneen ikkuna.
   Kun avaan etusivun ja jokaisen pelin. Niin mikään painike ei jää
   ruudun ulkopuolelle eikä sivua tarvitse vierittää sivusuunnassa.
4. Annettu iPad, ei hiirtä eikä näppäimistöä. Kun pelaan jokaisen pelin
   kierroksen alusta loppuun. Niin kaikki toiminnot onnistuvat pelkällä
   napautuksella (mukaan lukien numeronäppäimistö ja aakkoset), ja
   jokainen napautettava kohde on vähintään 44 × 44 pistettä (Applen
   ohjeen vähimmäiskoko).
5. Annettu laitteessa ei ole suomen tai espanjan ääntä tai puhe ei
   käynnisty. Kun painan pelissä "kuuntele"-painiketta ja pelaan kierroksen.
   Niin peli ei jää odottamaan ääntä (mikään painike ei jää pysyvästi
   lukkoon) ja kierros on pelattavissa loppuun.
6. Annettu iPad, peli juuri avattu eikä mitään ole vielä napautettu.
   Kun painan "Kuuntele" kerran. Niin ääni kuuluu heti tästä yhdestä
   napautuksesta (ei vaadi toista yritystä).

### SEI-45 — Luonnollisempi puheääni (suomi ja espanja)
Tila: done
Havainto (2026-10-23): omistaja latasi Maciin Satun ja Mónican parannetut
äänet ja kuunteli julkaistua sivua Chromella: "parempi" (hola ja kaksi
erillistä kissaa). iPadilla ei kuunneltu; kriteeri 7 ja §7 C tarkistetaan
SEI-2:n iPad-tarkistuksen yhteydessä.
Havainto (2026-10-23): omistaja avasi https://hakaotu.github.io/seikkailut/
Macilla ja sanoi sanatarkasti: "en tykkää tosta nykyisestä tietokoneäänestä.
Eikö meillä voisi olla mitään luonnollisempaa puheääntä siihen?" Mitä ääntä
hän kuuli ja missä pelissä, ei tiedetä.
Koodista luettua (pääsessio, 2026-10-23; ei havainto): `app/src/speech.js`
`pickVoice` (rivit noin 46–55) ottaa ensimmäisen laitteen äänen, joka sopii
kieleen. Omistajan Macissa on useita suomen ääniä, mm. Eddy, Flo, Grandma,
Grandpa, Reed, Rocko, Sandy, Shelley (leluääniä) ja tavallinen Satu;
espanjalle Mónica ja sama leluäänten joukko. Sovellus voi siis valita
leluäänen. Tätä ei ole todennettu.
Havainto (2026-10-23): omistaja Macilla, Chrome, https://hakaotu.github.io/seikkailut/,
Sanat-kortti, sanatarkasti: "ja toistotahti pitäs olla sit rauhallisempi. Nyt
se Kissakissa kuulostaa just tolta, että se olis yhteen kirjoitettuna."
Omistaja tarkoittaa: toiston tahdin pitäisi olla rauhallisempi; sanan kaksi
lukukertaa menevät nyt yhteen kuin yhteen kirjoitettuna.
Koodista ja selaimesta luettua (pääsessio, 2026-10-23, Chrome Playwrightilla
tällä Macilla; ei omistajan havainto): Sanat-kortin napautus puhuu "kissa"
kahtena peräkkäin jonotettuna lausumana äänellä Satu (fi-FI), nopeuksilla
0,78 ja 0,52, ilman taukoa niiden välillä. Omistaja vahvisti käyttävänsä
Chromea.
Perustelu: puhe on kaikissa kolmessa pelissä lapsen tapa kuulla sana tai
lasku; omistajan mielestä nykyinen ääni kuulostaa keinotekoiselta.
Riippuvuus: ei estä muita; kattaa kunkin pelin sitä mukaa kun SEI-2 – SEI-4
tuovat sen sovellukseen. Ei sido toteutustapaa (ks. avoimet kysymykset).
Kriteerit (mitä omistaja kuulee; Mac, https://hakaotu.github.io/seikkailut/):
1. Annettu suomenkielinen sana tai lasku (esim. sana KISSA, "Kuuntele").
   Kun kuuntelen sen Macilla. Niin ääni ei ole leluääni (ei huvittava,
   vääristetty tai hahmoääni; ei Eddy, Flo, Grandma, Grandpa, Reed, Rocko,
   Sandy eikä Shelley, jos ääni tulee laitteesta), ja omistaja sanoo sen
   kuulostavan luonnolliselta. Jos hän sanoo sen yhä kuulostavan
   tietokoneelta, kriteeri ei täyty.
2. Annettu espanjankielinen sana (esim. "rojo", "hola"). Kun kuuntelen sen.
   Niin se lausutaan espanjaksi espanjaa puhuvalla äänellä (ei suomalaisella
   äänellä espanjaa lukien), eikä ääni ole leluääni; omistaja sanoo sen
   kuulostavan luonnolliselta.
3. Annettu sama sana kuunneltuna kahdesti peräkkäin ja sivun
   uudelleenlatauksen jälkeen kolmannen kerran. Kun vertaan. Niin ääni on
   joka kerralla sama (ei vaihdu äänestä toiseen).
4. Annettu jokainen kohta, jossa nykyinen sovellus puhuu: Matikan lasku
   ("plus", "miinus", "kertaa") ja vastaus, Sanojen sana, tavut ja
   valitut kirjaimet sekä hitaampi toisto, Espanjan sanat. Kun kuuntelen
   jokaisen. Niin yksikään ei käytä vanhaa ääntä; tarkistetaan pelikohtaisesti
   kun peli on sovelluksessa.
5. Annettu napautus "Kuuntele". Kun mittaan ajan napautuksesta ääneen
   Macilla. Niin ääni alkaa alle 1 sekunnissa (pm:n ehdotus, ei omistajan
   raja; vahvistetaan tai muutetaan suunnittelussa). Mittaustapa ja
   selain kirjataan tehtävään.
6. Annettu laite, jolla toivottua ääntä ei ole (tai ääni ei lataudu).
   Kun painan "Kuuntele" ja pelaan kierroksen. Niin ääni silti kuuluu
   jollakin äänellä tai peli ei jää odottamaan (SEI-1 kriteeri 5 pätee
   edelleen: mikään painike ei lukkiudu).
7. Annettu iPad, peli juuri avattu eikä mitään ole napautettu. Kun painan
   "Kuuntele" kerran. Niin ääni kuuluu tästä yhdestä napautuksesta
   (SEI-1 kriteeri 6 pätee edelleen). Tarkistetaan, kun iPad on käsillä
   (SEI-2:n yhteydessä).
8. Annettu sana, joka luetaan kaksi kertaa (esim. KISSA Sanat-kortissa).
   Kun painan sitä Macilla Chromessa. Niin kahden lukukerran välissä on
   selvästi kuuluva tauko, eivätkä ne kuulosta yhdeltä sanalta (ei
   "kissakissa"), ja omistaja sanoo toiston tahdin olevan rauhallinen.
   Tauon pituus jätetään suunnitteluun (pm:llä ei ole perustetta
   numerolle). Tauko ei saa viivästyttää tai estää ensimmäistä lukukertaa:
   SEI-1 kriteeri 6 (ääni kuuluu ensimmäisestä napautuksesta iPadilla)
   pätee edelleen; tarkistetaan iPadilla SEI-2:n yhteydessä kriteerin 7
   kanssa.

Avoimet kysymykset:
- Reitti on auki, omistajalle esitetään kaksi vaihtoehtoa. A: käytetään
  parasta laitteessa jo olevaa ääntä (esim. Satu ja Mónica, ja parannettu
  versio jos asennettu). B: kerran valmiiksi tehdyt luonnolliset
  äänitiedostot, jotka toimitetaan sovelluksen mukana. Kriteerit on
  kirjoitettu kumpaankin sopiviksi. Arkkitehti ottaa kantaa, kun omistaja on
  päättänyt.
- Mitä ääntä omistaja kuuli ja millä selaimella? Ei tiedossa. Pääsessio voi
  selvittää, minkä äänen sovellus valitsee tässä Macissa; selainta ei tiedetä.
- Riittääkö Mac, vai pitääkö ääni kuulostaa samalta iPadilla? A:ssa ääni
  riippuu laitteesta, B:ssä ei. Omistajalla ei ole iPadia käsillä.
- Tarvitaanko toimintaa ilman verkkoa (SEI-18, ehdotus, ei hyväksytty)?
  Vaikuttaa reitin valintaan.
- B kattaa vain etukäteen tiedetyt tekstit (sanalistat, kehut); Matikan
  laskuja ja lukuja tulee olla rajattu joukko. Kuka tarkistaa espanjan
  ääntämisen (K3:n tarkistaja ei ole nimetty)?

## B. Nykyisen toiminnan säilyttäminen (jokainen nykyinen käyttötapaus)

### SEI-2 — Matikka: kaikki nykyiset toiminnot uudessa sovelluksessa
Tila: done
Havainto (2026-10-23): pääsessio pelasi julkaistun Matikan Chromella
(Satu (Enhanced), 2/10 ja 10/10 eri loppuruudut); omistaja Macilla Chromella
(Q24): lasku ja "Ei ihan. Oikea vastaus on …" kuuluivat. iPad (suunnitelma
§7 C) myöhemmin.
Perustelu: omistaja vaati kaikki use caset; tämä on Matikkaseikkailun
koko nykyinen käyttö.
Riippuvuus: SEI-1.
Kriteerit (lähde: `originals/matikkaseikkailu.html`):
1. Annettu valittu taso "Eskari". Kun pelaan kierroksen (10 tehtävää).
   Niin yhteenlaskussa summa on 0–10, vähennyslaskun tulos on 0–10 ja
   kertolaskun tekijät ovat 1–5; vastaus annetaan valitsemalla neljästä
   vaihtoehdosta, joista tasan yksi on oikea.
2. Annettu taso "1. luokka". Kun pelaan kierroksen. Niin yhteen- ja
   vähennyslaskujen luvut ovat enintään 20, kertolaskussa ensimmäinen
   tekijä on 1–5 ja toinen 1–10; vastaus kirjoitetaan numeronäppäimistöllä.
3. Annettu taso "2. luokka". Kun valitsen sen. Niin kertolasku kytkeytyy
   itsestään päälle, ja tehtävät ovat: summa enintään 100, vähennys 10–100
   luvusta, kertolaskun tekijät 2–10; vastaus kirjoitetaan.
4. Annettu laskutavat yhteen-, vähennys- ja kertolasku. Kun kytken jonkin
   pois tai päälle. Niin uusi kierros alkaa pelkästään valituilla
   laskutavoilla; viimeistä päälläolevaa ei voi kytkeä pois.
5. Annettu kirjoitettava vastaus. Kun painan numeroita (enintään 4),
   poistoa ja OK, tai näppäimistön numeroita, Backspacea ja Enteriä.
   Niin vastaus muuttuu vastaavasti; tyhjällä vastauksella OK ei tee
   mitään.
6. Annettu kysymys. Kun vastaan oikein. Niin näen kehun, lasku täydentyy
   oikealla vastauksella ja vastaus luetaan ääneen.
7. Annettu kysymys. Kun vastaan väärin. Niin oikea vastaus näytetään
   selvästi (Eskarilla oikea nappi korostuu, kirjoitettavassa tehtävässä
   oikea luku tulee näkyviin).
8. Annettu kysymys. Kun avaan sen. Niin lasku luetaan suomeksi ("plus",
   "miinus", "kertaa") ja "Kuuntele lasku" lukee sen uudelleen.
9. Annettu kierros. Kun vastaan. Niin näen pisteet muodossa oikein /
   vastattu, edistymispalkin, 0–5 tähteä oikeiden osuuden mukaan, ja kun
   olen vastannut vähintään 3 oikein peräkkäin, tekstin "N peräkkäin
   oikein".
10. Annettu vastattu kysymys. Kun painan Seuraava (tai kirjoitettavassa
    tehtävässä Enter). Niin seuraava lasku tulee; kymmenennen jälkeen
    näkyy loppuruutu konfetteineen, tuloksineen ja "Pelaa uudelleen"
    -painikkeineen.

### SEI-3 — Sana: kaikki nykyiset toiminnot uudessa sovelluksessa
Tila: done
iPad (omistaja, 2026-10-26): "testasin ipadilla ja hyvin toimii kaikki" — yleishavainto,
malli, iOS-versio ja yksittäiset §10 C -kohdat kirjaamatta.
Perustelu: omistaja vaati kaikki use caset; tämä on Sanaseikkailun koko
nykyinen käyttö.
Riippuvuus: SEI-1.
Huomio (2026-10-26): Sanojen ulkoasuluonnos `docs/design/sei-3.md` (+ `.html`)
hyväksytty omistajalla (Q26: "ok ja jatka"); kattaa SEI-3, SEI-7 ja SEI-8.
Luonnos ei sisällä automaattista siirtymistä oikean sanan jälkeen; se on
SEI-47 ja suunnitellaan yhdessä SEI-46:n kanssa (ks. SEI-47).
Kriteerit (lähde: `originals/sanaseikkailu.html`):
1. Annettu teema "Normaali". Kun pelaan useita kierroksia. Niin sanat
   tulevat 24 sanan listasta ja jokainen sana näytetään kuvansa kanssa
   (lista ja kuvat samat kuin nykyisessä: KISSA … TULI).
2. Annettu teema "Harry Potter". Kun valitsen sen. Niin uusi kierros
   alkaa ja sanat tulevat vain 20 sanan listasta (JÄSTI … TAIKAJUOMA),
   ei Normaali-teeman sanoista.
3. Annettu taso "Helppo". Kun avaan sanan. Niin kuva ja vihje näkyvät,
   kirjaimet ovat sekoitettuina laattoina, ja kuvaa napauttamalla sana
   luetaan.
4. Annettu taso "Keskitaso". Kun avaan sanan. Niin kuva on piilossa
   (kysymysmerkki), ohje kehottaa kuuntelemaan ja rakentamaan sanan
   laatoista; oikean vastauksen jälkeen kuva paljastuu.
5. Annettu taso "Vaikea". Kun avaan sanan. Niin kuva on piilossa, laattoja
   ei ole, ja kirjaimet valitaan koko aakkostosta A–Z sekä Å, Ä, Ö.
6. Annettu käynnissä oleva sana. Kun vaihdan tasoa. Niin sama sana alkaa
   alusta uudella tasolla ja pisteet säilyvät; kun vaihdan teemaa, uusi
   kierros alkaa.
7. Annettu tavutus-kytkin. Kun kytken sen päälle sanassa KISSA. Niin
   kirjainruudut näytetään tavuviivalla (KIS-SA) ja "kuuntele" lukee
   sanan ja sitten tavut erikseen; päällä sanalla "AUTO" tavut ovat AU-TO.
8. Annettu sana. Kun avaan sen tai painan "Kuuntele sana". Niin sana
   luetaan kahdesti, toisella kerralla hitaammin (tavutuksella päällä:
   sana, sitten tavut), ja jokainen valitsemani kirjain luetaan ääneen.
9. Annettu kaikki kirjaimet valittu. Kun sana on oikein. Niin ruudut
   vilkkuvat vihreinä, kehu näkyy ja voittoääni (`vauhti.mp3`) soi
   enintään 3 sekuntia.
10. Annettu kaikki kirjaimet valittu. Kun sana on väärin. Niin virheviesti
    näkyy ja ruudut täyttyvät uudelleen yritystä varten; "Aloita alusta"
    -painike tyhjentää sanan koska tahansa.
11. Annettu kierros (10 sanaa). Kun vastaan. Niin näen pisteet,
    edistymispalkin ja tähdet; kymmenennen jälkeen loppuruutu konfetteineen
    ja "Pelaa uudelleen".

### SEI-4 — Espanja: kaikki nykyiset toiminnot uudessa sovelluksessa
Tila: done
iPad (omistaja, 2026-10-26): "testasin ipadilla ja hyvin toimii kaikki" — yleishavainto,
malli, iOS-versio ja yksittäiset §10 C -kohdat kirjaamatta.
APPROVED 2026-10-26 (commitit 3329b59, bb817ed, b5aea2f, 0311e50; placeholderin
poisto osui commitiin 331a67b). Kriteeri 7 mitataan hyväksyttyä ulkoasua vasten
("x / 10 oikein", "Pelaa uudelleen"), ei kriteerin vanhoja tekstejä. Avoimet
jäljet (eivät estä): alle 600/520/420 px leveydellä kortit ja fonttikoot
poikkeavat ulkoasusta — designer hyväksyy tai hylkää; kapean näytön "vaihtoehdot
yhdessä sarakkeessa" -testi puuttuu.
Havainto A (pääistunto, 2026-10-26 ~16.00): https://hakaotu.github.io/seikkailut/,
commit 3ad6158, Chrome 155.0.8059.85 (Playwright channel chrome, headed,
1280×720), ääni Mónica (Enhanced), es-ES. Koskee SEI-4, 9, 10, 48.
A1: valintaruutu, Suomi → Espanja valittuna, "Tähtiä: 0"; Kuuntele luki "hola".
A2: Suomi → Espanja, 10 oikein ilman napautuksia: 9 väliä 4010, 4007, 4004,
4004, 4005, 4007, 4005, 4004, 4004 ms; "Katso tulos" odotti; napautus →
"Täydellinen tulos!", "Tähtiä: 1"; uudelleenlatauksen jälkeen "Tähtiä: 1".
A3: Espanja → Suomi, siemen 26: "buenas tardes" -vastauksen luku päättyi 919 ms,
seuraava sana "buenas noches" luettiin 4006 ms kohdalla.
A4: 6 oikein + 4 ohitettu → "6 / 10 oikein", rivit "6 oikein / 4 ohitettu",
"Tähti tulee, kun saat 8 oikein.", tähtiä 0.
A5: vaihtoehdoissa "ole kiltti" (por favor) ja "hyvää iltapäivää" (buenas tardes).
B (omistaja, Mac, 2026-10-26, Q43): "toimii" — sana kuului, nappi täyttyi,
seuraava sana tuli ja luettiin. SEI-48 done. SEI-4/9/10 odottavat C:tä (tähti
tallessa myöhempänä päivänä, kysytään aikaisintaan 2026-10-27).
C (omistaja, 2026-10-27, Q44): avasi Espanjan seuraavana päivänä, eilen
ansaittu tähti näkyi yläpalkissa — "joo". SEI-4, SEI-9 ja SEI-10 done.
Perustelu: omistaja vaati kaikki use caset; tämä on Espanjavalmentajan
koko nykyinen käyttö.
Riippuvuus: SEI-1.
Huomio (2026-10-26): Espanjan ulkoasu `docs/design/sei-4.md` (+ `.html`)
hyväksytty omistajalla (Q31: "ok"); kattaa SEI-4, SEI-9 ja SEI-10. Omistajan
päätös (Q33: "ok"): vanhan Espanjavalmentajan tähtiä ei siirretä, tähdet
alkavat uudessa sovelluksessa nollasta (design kohta 5, E20; kriteeri 11).
Luonnos kuvaa myös automaattisen siirtymisen oikean vastauksen jälkeen; se on
oma tehtävänsä SEI-48 (Q31), eikä kuulu SEI-4:n kriteereihin.
Kriteerit (lähde: `originals/espanjavalmentaja.html`):
1. Annettu suunta "Suomi → Espanja". Kun pelaan kierroksen. Niin kysymys
   on suomeksi ja neljä vaihtoehtoa on espanjaksi, joista yksi on oikea;
   väärät vaihtoehdot ovat samasta aiheesta (tervehdys / väri).
2. Annettu suunta "Espanja → Suomi". Kun pelaan kierroksen. Niin kysymys
   on espanjaksi ja vaihtoehdot suomeksi; suunnan vaihto aloittaa uuden
   kierroksen.
3. Annettu 18 sanaa (8 tervehdystä, 10 väriä). Kun pelaan kierroksen.
   Niin 10 kysymystä arvotaan 18 sanasta ilman toistoa, ja vihjerivi
   kertoo aiheen.
4. Annettu kysymys. Kun valitsen vastauksen. Niin oikea korostuu
   vihreällä, väärä valinta punaisella, ja vastausvaihtoehdot lukittuvat
   kunnes siirryn eteenpäin.
5. Annettu suunta Suomi → Espanja. Kun painan "Kuuntele". Niin kaikki
   vaihtoehdot luetaan espanjaksi vuorotellen; suunnassa Espanja → Suomi
   kysymyssana luetaan espanjaksi, ja oikean vastauksen jälkeen se luetaan
   uudelleen.
6. Annettu kysymys. Kun painan "Ohita" tai "Seuraava". Niin seuraava
   kysymys tulee (nykyinen toiminta; SEI-10 tarkentaa, miten ohitettu
   näkyy tuloksessa).
7. Annettu kierros. Kun vastaan. Niin näen pisteet muodossa x/10 ja
   edistymispalkin; kierroksen lopussa teksti kertoo tuloksen ("Sait x/10
   pistettä") ja "Uusi kierros" -painike aloittaa uuden.
8. Annettu kierros päättyy tulokseen 8/10 tai paremmin. Kun kierros
   päättyy. Niin saan konfetin ja yhden tähden, ja tähtien määrä näkyy
   sivulla (enintään 10 tähteä, sen jälkeen "×n"); tulos 7/10 ei anna
   tähteä.
9. Annettu saatu tähti. Kun suljen sivun ja avaan sen myöhemmin samalla
   laitteella. Niin tähtien määrä on sama.
10. Annettu ruudunlukija. Kun kysymys vaihtuu. Niin uusi kysymys
    ilmoitetaan ruudunlukijalle, ja vastaukset on nimetty (nykyiset
    saavutettavuusmerkinnät säilyvät).
11. (Lisätty 2026-10-26, Q33.) Annettu laite, jossa vanha Espanjavalmentaja
    on aiemmin antanut tähtiä (tai jossa niitä ei ole). Kun avaan uuden
    Espanjan ensimmäisen kerran. Niin kerättyjä tähtiä on 0 (yläpalkissa
    tyhjä tähti ja `0`, design kohta 3.0); vanhoja tähtiä ei näy eikä niitä
    yritetä siirtää.

## C. Nykyisten toimintojen laatu (lähtötaso koodista luettu, ei havaintoja)

Nämä perustuvat kooditasoiseen lukemiseen. Kukaan ei ole kokenut niitä
vioiksi. Ne liittyvät omistajan toiveeseen "UX paljon parempi"; ne ovat
mukana ensimmäisessä versiossa vain jos K1 niin ratkaisee. Vakavuutta ei
anneta.

### SEI-5 — Matikka: virhepalaute ja tapahtuma vastaavat toisiaan
Tila: done
Havainto (2026-10-23): pääsessio pelasi julkaistun Matikan Chromella
(Satu (Enhanced), 2/10 ja 10/10 eri loppuruudut); omistaja Macilla Chromella
(Q24): lasku ja "Ei ihan. Oikea vastaus on …" kuuluivat. iPad (suunnitelma
§7 C) myöhemmin.
Perustelu: lähtötaso: väärän vastauksen viesti kehottaa yrittämään
uudelleen, mutta napit lukittuvat ja peli jatkaa.
Riippuvuus: SEI-2. Designer päättää, saako lapsi uuden yrityksen vai ei.
Kriteerit:
1. Annettu väärä vastaus Eskari-tasolla. Kun näen palautteen. Niin
   palautteen teksti ja se mitä voin seuraavaksi tehdä ovat sopusoinnussa:
   jos teksti kehottaa yrittämään uudelleen, voin vastata samaan laskuun
   uudelleen; jos ei voi, teksti ei sano niin.
2. Annettu väärä vastaus kirjoitettavassa tehtävässä. Kun näen palautteen.
   Niin sama sääntö kuin kohdassa 1 pätee.

### SEI-6 — Loppuruutu kertoo todellisen tuloksen (Matikka)
Tila: done
Havainto (2026-10-23): pääsessio pelasi julkaistun Matikan Chromella
(Satu (Enhanced), 2/10 ja 10/10 eri loppuruudut); omistaja Macilla Chromella
(Q24): lasku ja "Ei ihan. Oikea vastaus on …" kuuluivat. iPad (suunnitelma
§7 C) myöhemmin.
Perustelu: lähtötaso: Matikan loppuruutu sanoo "Olet matikkamestari!"
riippumatta tuloksesta.
Riippuvuus: SEI-2.
Kriteerit:
1. Annettu kierros päättyy tulokseen 2/10. Kun loppuruutu näkyy. Niin
   teksti ja ääni eivät väitä lasta mestariksi, vaan vastaavat tulosta.
2. Annettu kierros päättyy tulokseen 10/10. Kun loppuruutu näkyy. Niin
   loppuruutu eroaa visuaalisesti ja tekstiltään tuloksesta 2/10.

### SEI-46 — Matikka: oikean vastauksen jälkeen siirtyy itsestään seuraavaan laskuun
Tila: done
iPad (omistaja, 2026-10-26): "testasin ipadilla ja hyvin toimii kaikki" — yleishavainto,
malli, iOS-versio ja yksittäiset §10 C -kohdat kirjaamatta.
Havainto A1 (pääistunto, 2026-10-26 ~11.15): https://hakaotu.github.io/seikkailut/,
commit 03da941, Chrome 155.0.8059.85 (Playwright channel chrome, headed,
1280×720), ääni Satu (Enhanced). Helppo, 10 oikein ilman napautuksia: 9 väliä
vastausnapautuksesta seuraavan laskun nimen vaihtumiseen 4022, 4004, 4005,
4003, 4004, 4003, 4002, 4003, 4005 ms; 10. jälkeen "Katso tulos" odotti.
Vastauksen puhe päättyi (406–838 ms) ennen seuraavan laskun lukemista kaikilla
9 kerralla. Väärä vastaus: lasku ei vaihtunut 10 s:ssa, ei täyttöä. Edellisen
laskun lukeminen keskeytyi ("interrupted"), kun vastattiin heti — odotettua.
A2 (omistaja, Mac, 2026-10-26, Q37): "kyllä" — nappi täyttyi, seuraava lasku
tuli itsestään ja luettiin ääneen. iPad-tarkistus (suunnitelma §10 C) odottaa laitetta.
Havainto (2026-10-23): omistaja kokeili julkaistua Matikkaa Macilla
(https://hakaotu.github.io/seikkailut/) ja sanoi sanatarkasti:
"matikkahommeliin voisi tehdä sellaisen automatiikan, että oikean vastauksen
jälkeen tulee palaute ja sit progress bar about 3-5s, jonka jälkeen siirtyy
automaattisesti seuraavaan laskuun ilman, että tarvii painaa seuraava".
Ongelma: jokainen vastaus vaatii nyt Seuraava-napin painalluksen, myös
oikean vastauksen jälkeen. Omistajan ehdottama ratkaisu on automaattinen
siirtyminen (ajastin ja edistymispalkki). Mitä ongelmaa hän tarkoittaa
(napin painaminen on työlästä, rytmi katkeaa, lapsi unohtaa painaa), ei
ole tiedossa.
Lähtötaso (`docs/design/sei-2.md`, hyväksytty Q20): jokaisen vastauksen
jälkeen odotetaan Seuraavaa, 10. vastauksen jälkeen `Katso tulos`.
Vanha peli hyppäsi loppuruutuun 1,5 s:n päästä; uusi suunnitelma korvasi
sen tarkoituksella (E7: lapsi ehtii nähdä viimeisen palautteen, iPad lukee
tuloksen ääneen vain napautuksesta). Tämä tehtävä ei kumoa E7:ää ilman
omistajan päätöstä (ks. avoin kysymys 4).
Perustelu: omistaja haluaa, ettei lapsen tarvitse painaa Seuraava jokaisen
oikean vastauksen jälkeen.
Riippuvuus: SEI-2 (done). Koskee ulkoasua ja viestejä: designer ennen
arkkitehtia.
Päivitys (2026-10-26): Q25:n säännöt ovat voimassa (vain oikean jälkeen,
4 s edistymispalkilla, Seuraava ohittaa odotuksen, 10. laskun jälkeen
`Katso tulos` säilyy). Samat säännöt on omistaja vahvistanut Sanoille
(Q28, SEI-47). Matikan ja Sanojen automaattisen siirtymisen ulkoasu
(palkki, äänet, liike, ruudunlukija) suunnitellaan yhdessä, jotta pelit
toimivat täsmälleen samoin.
Kriteerit (oletuksilla, ks. avoimet kysymykset; lapsen näkemä ja kuulema):
1. Annettu lapsi vastaa laskuun oikein (mikä tahansa kolmesta tasosta,
   laskuista 1–9). Kun kehu ja oikea vastaus ovat näkyvissä. Niin kehun
   alle ilmestyy edistymispalkki, joka täyttyy tasaisesti oletuksella
   4 sekunnin ajan (kysymys 2), ja täytyttyään seuraava lasku tulee ilman
   yhtään napautusta.
2. Annettu sama tilanne. Kun palkki on täyttymässä. Niin oikean vastauksen
   lukeminen ääneen ehtii loppuun ennen kuin seuraava lasku tulee (ääni ei
   katkea uuden laskun tullessa).
3. Annettu seuraava lasku tuli itsestään. Kun se tulee näkyviin. Niin se
   luetaan ääneen kuten nykyisin, ja edistymispalkki ja Seuraava-painike
   ovat piilossa, kunnes taas on vastattu.
4. Annettu lapsi vastaa väärin. Kun näkee palautteen "Ei ihan. Oikea
   vastaus on …". Niin palkkia ei ole eikä seuraava lasku tule itsestään;
   Seuraava-painike odottaa kuten nykyisin (oletus, kysymys 1). Lapsi
   ehtii lukea oikean vastauksen niin kauan kuin haluaa.
5. Annettu palkki on täyttymässä. Kun lapsi painaa Seuraavaa (painike on
   näkyvissä ja toimii, oletus, kysymys 3). Niin seuraava lasku tulee heti,
   palkki katoaa, eikä ajastin siirrä vielä yhtä laskua eteenpäin
   (ei ohiteta kahta laskua).
6. Annettu palkki on täyttymässä. Kun lapsi poistuu pelistä etusivulle,
   vaihtaa tasoa tai laskutapoja tai aloittaa uuden kierroksen. Niin
   ajastin ei tee mitään uudessa näkymässä (ei laskua ilmesty
   etusivulle tai uuden kierroksen päälle).
7. Annettu 10. lasku vastataan oikein. Kun palaute näkyy. Niin näkyvissä
   on `Katso tulos` kuten nykyisin eikä palkkia; loppuruutu tulee vasta
   napautuksesta (oletus, kysymys 4; E7 pysyy).
8. Annettu käyttöjärjestelmän asetus "vähennä liikettä" päällä (kuten
   nykyisen suunnitelman liikekohdat). Kun oikea vastaus on annettu. Niin
   odotus näkyy silti (palkki ilman liikuttavaa animaatiota tai
   vastaava), ja siirtyminen tapahtuu samassa ajassa. Designer päättää
   tavan.
9. Annettu ruudunlukija. Kun oikea vastaus annetaan. Niin ruudunlukija
   kertoo, että seuraava lasku tulee itsestään (ennen siirtymistä), ja
   uusi lasku ilmoitetaan kuten nykyisin.
10. Annettu Macilla Chromella pelattu täysi kierros, kaikki oikein. Kun
    lapsi ei napauta mitään oikeiden vastausten jälkeen. Niin laskut 2–10
    tulevat itsestään, ja 10. laskun jälkeen odottaa `Katso tulos`.
    Mittaus kirjataan: selain, tila, ja kesto kellolla napautuksesta
    seuraavan laskun ilmestymiseen (tavoite oletuksella 4 s, ks.
    kysymys 2).

Avoimet kysymykset (oletus voimassa kunnes omistaja vastaa; ei päätöksiä):
1. Väärä vastaus. Omistaja sanoi vain "oikean vastauksen jälkeen".
   Oletus: väärän vastauksen jälkeen odotetaan edelleen Seuraavaa.
2. Tarkka kesto. Omistaja sanoi "about 3-5s". Oletus: 4 s. Voi
   tarkentaa kokeilemalla (iPad ja Mac).
3. Voiko lapsi ohittaa odotuksen napauttamalla Seuraavaa. Oletus: kyllä
   (kriteeri 5).
4. Siirtyykö myös 10. vastauksen jälkeen itsestään loppuruutuun. Oletus:
   ei, `Katso tulos` säilyy (kriteeri 7).
5. (pm:n kysymys, ei omistajalle ellei designer tarvitse) Pitääkö lapsen
   pystyä pysäyttämään odotus (esim. lukee vielä oikeaa vastausta)?
   Oletuksessa ei; Seuraava ei estä muuta kuin siirtymistä.
Riskit:
- iPad: seuraava lasku luetaan ääneen ajastimesta, ei napautuksesta.
  Sama tarkistamaton kysymys kuin SEI-45:n tauko: iPad-Safari voi estää
  puheen, jota ei ole käynnistetty napautuksesta. Jos estää, lasku tulee
  näkyviin mutta jää lukematta; peli ei silti saa jäädä jumiin (SEI-1
  kriteeri 5). Tarkistetaan iPadilla SEI-2:n iPad-tarkistuksen
  (suunnitelma §7 C) yhteydessä; ei tarkistettu.
- Lukeva lapsi ehtii eri tahtia kuin toinen; kiinteä aika voi tuntua liian
  nopealta tai hitaalta. Siksi kysymykset 2 ja 3.
- Puhe oikeasta vastauksesta ja edistymispalkin aika voivat mennä
  päällekkäin (kriteeri 2); puheen kesto vaihtelee laitteen äänen mukaan,
  ei mitattu.

### SEI-47 — Sanat: oikean sanan jälkeen siirtyy itsestään seuraavaan sanaan
Tila: done
iPad (omistaja, 2026-10-26): "testasin ipadilla ja hyvin toimii kaikki" — yleishavainto,
malli, iOS-versio ja yksittäiset §10 C -kohdat kirjaamatta.
Havainto B1 (pääistunto, 2026-10-26 ~14.40): https://hakaotu.github.io/seikkailut/,
commit 22b9835, Chrome 155.0.8059.85 (Playwright channel chrome, headed,
1280×720), ääni Satu (Enhanced). Koskee myös SEI-3, SEI-7, SEI-8.
1) Normaali, Helppo, tavutus pois, 10 oikein ilman napautuksia: 9 väliä
   viimeisestä kirjainnapautuksesta "Sana n / 10" -ilmoitukseen 4009, 4004,
   4005, 4004, 4004, 4004, 4005, 4004, 4004 ms; 10. jälkeen "Katso tulos" odotti.
2) Voittoääni: pause 3000–3002 ms playn jälkeen (10/10), seuraavan sanan
   lukeminen 1001–1002 ms pausen jälkeen (9/9).
3) Kierros: 1 väärin+korjattu, 3 ohitettu, 6 heti oikein → loppuruutu "6 / 10",
   rivit "6 sanaa heti oikein / 1 sana oikein uudella yrityksellä / 3 sanaa
   ohitettu".
4) Harry Potter, Vaikea, tavutus päällä: JÄSTI kirjoitettu oikein; Kuuntele
   luki "jästi" (0.78), "jäs", "ti" (0.62) erillisinä.
B2 (omistaja, Mac, 2026-10-26, Q38): "toimii" — voittoääni kuului ja seuraava
sana tuli itsestään. iPad-tarkistus (suunnitelma §10 C) odottaa laitetta.
Havainto: ei omaa havaintoa Sanoista; omistaja vahvisti 2026-10-26 (Q28),
että Sanat toimii kuten Matikka (SEI-46). Kysymys oli sanatarkasti:
"Siirtyykö myös Sanat oikean sanan jälkeen itsestään seuraavaan (kuten
Matikka, SEI-46)? Oletus: kyllä, samoin säännöin." Omistajan vastaus: "joo".
SEI-46:n lähtöhavainto (omistaja 2026-10-23, Mac, Matikka) on sen perustelu.
Säännöt (Q25, Matikalle; Q28 ulottaa ne Sanoille): vain oikean vastauksen
jälkeen; 4 s edistymispalkilla; Seuraava ohittaa odotuksen; 10. kohteen
jälkeen `Katso tulos` säilyy (ei hyppyä loppuruutuun itsestään).
Perustelu: omistaja haluaa, että kaksi peliä toimii samoin eikä lapsen tarvitse
painaa Seuraava jokaisen oikean sanan jälkeen.
Riippuvuus: SEI-3, SEI-7, SEI-8 (Sanat uudessa sovelluksessa, ulkoasu
`docs/design/sei-3.md` hyväksytty Q26) ja SEI-46:n ulkoasu. Koskee ulkoasua ja
viestejä: designer ennen arkkitehtia, ja Matikan ja Sanojen automaattisen
siirtymisen ulkoasu suunnitellaan yhdessä, jotta pelit käyttäytyvät
täsmälleen samoin. Tämä tehtävä voidaan julkaista vasta, kun Sanat on
sovelluksessa (SEI-3).
Kriteerit (lapsen näkemä ja kuulema; "oikein" = sana oikein heti tai oikein
uudella yrityksellä, kumpikin lasketaan oikeaksi; sanalista, taso ja tavutus
mitkä tahansa):
1. Annettu lapsi kokoaa sanan oikein (heti ensimmäisellä tarkistuksella).
   Kun kehu ja kuva ovat näkyvissä. Niin kehun alle ilmestyy edistymispalkki,
   joka täyttyy tasaisesti 4 sekunnin ajan, ja täytyttyään seuraava sana
   tulee ilman yhtään napautusta.
2. Annettu sana, jossa ensimmäinen tarkistus oli väärä (esim. KISTA) ja lapsi
   korjasi sen oikeaksi. Kun sana on oikein. Niin sama palkki ja
   siirtyminen kuin kohdassa 1; palkkia ei ole, kun vastaus on väärä, ja
   väärän tarkistuksen jälkeen seuraava sana ei tule itsestään (lapsi voi
   korjata tai painaa Ohita).
3. Annettu lapsi ohittaa sanan (Ohita, SEI-7). Kun `Ohitettu. Sana on …`
   näkyy ja sana on luettu. Niin palkkia ei ole eikä seuraava sana tule
   itsestään; Seuraava odottaa painallusta (Q27, design E5), ja lapsi ehtii
   katsoa ohitettua sanaa niin kauan kuin haluaa.
4. Annettu oikein menneen sanan palkki on täyttymässä. Kun viimeisen kirjaimen
   luku ja voittoääni (`vauhti.mp3`, enintään 3 s) soivat. Niin ne ehtivät
   loppuun ennen kuin seuraava sana tulee (ääni ei katkea uuden sanan
   tullessa).
5. Annettu seuraava sana tuli itsestään. Kun se tulee näkyviin. Niin se
   luetaan ääneen kuten Seuraava-napautuksen jälkeen nykyisin (sana kahdesti
   tauon kanssa, tavutuksella päällä sana ja tavut), ja palkki ja
   Seuraava-painike ovat piilossa, kunnes sana on taas valmis.
6. Annettu palkki on täyttymässä. Kun lapsi painaa Seuraavaa (painike on
   näkyvissä ja toimii). Niin seuraava sana tulee heti, palkki katoaa, eikä
   ajastin siirrä vielä yhtä sanaa eteenpäin (ei ohiteta kahta sanaa).
7. Annettu palkki on täyttymässä. Kun lapsi vaihtaa tasoa tai tavutusta
   (`Vaihda` → `Takaisin sanaan`), vaihtaa sanalistaa, aloittaa uuden
   kierroksen (`Aloita uusi kierros`, `Pelaa uudelleen`) tai poistuu pelistä
   etusivulle. Niin ajastin ei tee mitään uudessa näkymässä (ei sanaa
   ilmesty etusivulle, valintaruudun tai uuden kierroksen päälle).
8. Annettu sana valmis, ajastin perutettu kohdan 7 tavalla (esim. paluu
   etusivulta). Kun palaan sanaan. Niin sana on valmis ja Seuraava odottaa
   painallusta; sana ei siirry itsestään (oletus, ks. avoin kysymys 2).
9. Annettu 10. sana tehdään oikein. Kun kehu näkyy. Niin näkyvissä on
   `Katso tulos` eikä palkkia; loppuruutu tulee vasta napautuksesta (Q25/Q28).
10. Annettu automaattinen siirtyminen. Kun kierros pelataan loppuun. Niin
    tulos (heti oikein / uudella yrityksellä / ohitettu) ja Kesken-merkin
    luku ovat samat kuin jos jokainen sana olisi siirretty Seuraavalla:
    siirtymistapa ei muuta pisteitä (SEI-8; Kesken kasvaa sanan valmistuessa,
    ei siirtyessä).
11. Annettu käyttöjärjestelmän asetus "vähennä liikettä" päällä. Kun oikea
    sana on annettu. Niin odotus näkyy silti (palkki ilman liikuttavaa
    animaatiota tai vastaava), ja siirtyminen tapahtuu samassa ajassa.
    Designer päättää tavan, sama kuin Matikassa (SEI-46 kriteeri 8).
12. Annettu ruudunlukija. Kun sana on oikein. Niin ruudunlukija kertoo, että
    seuraava sana tulee itsestään (ennen siirtymistä), ja uusi sana
    ilmoitetaan kuten nykyisin.
13. Annettu Macilla Chromella pelattu täysi kierros, kaikki sanat heti oikein.
    Kun lapsi ei napauta mitään kirjainten jälkeen. Niin sanat 2–10 tulevat
    itsestään, ja 10. sanan jälkeen odottaa `Katso tulos`. Mittaus kirjataan:
    selain, taso, tavutus päällä/pois, sanalista, ja kesto kellolla
    sanan valmistumisesta seuraavan sanan ilmestymiseen (tavoite 4 s).
14. Annettu SEI-46 (Matikka) ja SEI-47 (Sanat) valmiina. Kun vertaan
    kummankin pelin automaattista siirtymistä (kesto, palkin ulkoasu,
    Seuraava-painikkeen ja ruudunlukijan käytös, peruutustilanteet). Niin
    ne ovat samat (yhteinen suunnittelu); poikkeama kirjataan perusteineen.

Avoimet kysymykset (ei omistajalle; designerille ja arkkitehdille):
1. Sanojen oikean sanan jälkeen soi voittoääni enintään 3 s, ja Matikan 4 s
   on valittu Matikan puheen mukaan (Q25). Riittääkö 4 s kehulle, voittoäänelle
   ja lapsen katsoa paljastunutta kuvaa Keskitasolla ja Vaikealla? Ei
   mitattu. Säännöt ovat omistajan (Q28: "samoin säännöin"), joten oletus on
   4 s; jos mittaus (kriteeri 13) osoittaa ristiriidan kriteerin 4 kanssa,
   se palautetaan omistajalle havaintona.
2. Kun lapsi poistuu etusivulle palkin aikana ja palaa: jatkuuko palkki,
   alkaako alusta vai odottaako Seuraava? Oletus (kriteeri 8): Seuraava
   odottaa. Designer ja arkkitehti vahvistavat, ja Matikalle sama (SEI-46
   kriteeri 6 sanoo vain, ettei ajastin tee mitään uudessa näkymässä).
Riskit:
- iPad: seuraava sana luetaan ääneen ajastimesta, ei napautuksesta. Sama
  tarkistamaton kysymys kuin SEI-46:ssa ja SEI-45:n tauossa: iPad-Safari voi
  estää puheen, jota ei ole käynnistetty napautuksesta. Jos estää, sana
  tulee näkyviin mutta jää lukematta; Helpolla kuva ja vihje kertovat sanan,
  mutta Keskitasolla ja Vaikealla sana on vain äänessä, joten lapsi ei voi
  tietää sanaa ennen kuin painaa Kuuntele (vakavampi kuin Matikassa, jossa
  lasku näkyy tekstinä). Peli ei saa jäädä jumiin (SEI-1 kriteeri 5).
  Tarkistetaan iPadilla SEI-2:n iPad-tarkistuksen yhteydessä; ei tarkistettu.
- Voittoääni (3 s) ja viimeisen kirjaimen puhe soivat yhtä aikaa; iPadilla
  äänitiedosto voi vaimentaa puheen (design §5, ei tarkistettu). Palkin 4 s
  jättää vain noin 1 s marginaalin voittoäänen jälkeen.
- Kiinteä aika voi tuntua liian nopealta tai hitaalta eri lukutaitoisille
  (sama riski kuin SEI-46:ssa).

### SEI-48 — Espanja: oikean vastauksen jälkeen siirtyy itsestään seuraavaan kysymykseen
Tila: done
iPad (omistaja, 2026-10-26): "testasin ipadilla ja hyvin toimii kaikki" — yleishavainto,
malli, iOS-versio ja yksittäiset §10 C -kohdat kirjaamatta.
Havainto: ei omaa havaintoa Espanjasta; omistaja hyväksyi 2026-10-26 (Q31:
"ok") Espanjan ulkoasuluonnoksen `docs/design/sei-4.md`, jossa Espanja siirtyy
oikean vastauksen jälkeen itsestään samoin säännöin kuin Matikka ja Sanat
(luonnoksen avoin kysymys 1, oletus "kyllä"; hyväksyntä kattaa oletuksen).
Lähtöhavainto on SEI-46:n (omistaja 2026-10-23, Mac, Matikka); säännöt Q25
(Matikka) ja Q28 (Sanat), ulkoasu `docs/design/sei-46.md` (hyväksytty Q29).
Säännöt: vain oikean vastauksen jälkeen; 4 s edistymispalkilla (design:
täyttyvä Seuraava-painike); Seuraava ohittaa odotuksen; 10. kysymyksen
jälkeen `Katso tulos` säilyy (ei hyppyä loppuruutuun itsestään).
Perustelu: omistaja haluaa, että kolme peliä toimivat samoin eikä lapsen
tarvitse painaa Seuraava jokaisen oikean vastauksen jälkeen.
Riippuvuus: SEI-4, SEI-9, SEI-10 (Espanja uudessa sovelluksessa, ulkoasu
`docs/design/sei-4.md` hyväksytty Q31) ja SEI-46:n yhteinen automaattisen
siirtymisen toteutus (design: yksi toteutus kaikille kolmelle pelille; missä
se asuu, on arkkitehdin asia). Voidaan julkaista vasta, kun Espanja on
sovelluksessa (SEI-4). Ulkoasu on jo hyväksytty (sei-4.md kohta 3.5 ja
sei-46.md), joten designeria ei tarvita ellei jokin kriteeri osoittaudu
ristiriitaiseksi.
Kriteerit (lapsen näkemä ja kuulema; "oikein" = valittu vaihtoehto on oikea;
Espanjassa ei ole uutta yritystä; suunta Suomi → Espanja tai Espanja → Suomi,
ellei toisin sanota):
1. Annettu lapsi valitsee oikean vaihtoehdon kysymyksessä 1–9. Kun kehu ja
   pari (esim. `hola = hei`) ovat näkyvissä. Niin Seuraava-painike on vaalea ja
   täyttyy tasaisesti 4 sekunnin ajan, ja täytyttyään seuraava kysymys tulee
   ilman yhtään napautusta.
2. Annettu lapsi valitsee väärän vaihtoehdon. Kun `Ei ihan. Oikea vastaus on
   …` näkyy. Niin Seuraava on heti täysi (ei täyty) eikä seuraava kysymys
   tule itsestään; lapsi ehtii katsoa oikeaa vastausta niin kauan kuin
   haluaa.
3. Annettu lapsi painaa Ohita. Kun `Ohitettu. Oikea vastaus on …` näkyy ja
   oikea espanjan sana on luettu. Niin Seuraava on heti täysi eikä seuraava
   kysymys tule itsestään (Q27:n tapa, design 3.6); lapsi ehtii katsoa
   oikeaa vastausta niin kauan kuin haluaa.
4. Annettu 10. kysymys vastataan oikein. Kun kehu näkyy. Niin näkyvissä on
   täysi `Katso tulos` eikä täyttyvää painiketta; loppuruutu tulee vasta
   napautuksesta (Q25).
5. Annettu oikean vastauksen odotus on käynnissä. Kun oikean vastauksen
   espanjan sana luetaan ääneen. Niin luku ehtii loppuun ennen kuin seuraava
   kysymys tulee (ääni ei katkea uuden kysymyksen tullessa; pisin sana
   `buenas noches` / `buenas tardes`, design 3.5 arvio noin 1,2 s,
   ei mitattu).
6. Annettu suunta Espanja → Suomi ja seuraava kysymys tuli itsestään. Kun se
   tulee näkyviin. Niin uusi espanjan kysymyssana luetaan ääneen kuten
   Seuraava-napautuksen jälkeen, ja täyttyvä painike on korvautunut: Seuraava
   on piilossa, kunnes taas on vastattu tai ohitettu.
7. Annettu suunta Suomi → Espanja ja seuraava kysymys tuli itsestään. Kun se
   tulee näkyviin. Niin sitä ei lueta ääneen (kuten Seuraava-napautuksen
   jälkeen, design 3.8), ja Kuuntele lukee vaihtoehdot kuten ennenkin.
8. Annettu odotus on käynnissä. Kun lapsi painaa Seuraavaa. Niin seuraava
   kysymys tulee heti, täyttö katoaa, eikä ajastin siirrä vielä yhtä
   kysymystä eteenpäin (ei ohiteta kahta kysymystä); sama kun napautus ja
   ajastimen päättyminen osuvat samaan hetkeen.
9. Annettu odotus on käynnissä. Kun lapsi painaa Etusivu, painaa Vaihda
   (suunnan valintaruutu), aloittaa uuden kierroksen tai selain siirtää
   sivun piiloon (esim. iPad lukkoon, toinen välilehti). Niin ajastin ei tee
   mitään uudessa näkymässä (ei kysymystä ilmesty etusivulle,
   valintaruudun tai uuden kierroksen päälle).
10. Annettu odotus perutettu kohdan 9 tavalla (esim. paluu etusivulta tai
    `Takaisin kysymykseen`). Kun palaan kysymykseen. Niin sama kysymys ja
    sama palaute ovat näkyvissä ja Seuraava on täysi ja odottaa napautusta;
    kysymys ei siirry itsestään eikä mitään lueta ääneen (oletus, ks. avoin
    kysymys 1).
11. Annettu automaattinen siirtyminen. Kun kierros pelataan loppuun. Niin
    oikein / väärin / ohitettu -luvut, pisteet (`Pisteet`, Kesken-merkki) ja
    tähti (8/10 tai enemmän; tähti tulee vasta kun `Katso tulos` -napautus
    avaa loppuruudun) ovat samat kuin jos jokainen kysymys olisi siirretty
    Seuraavalla: siirtymistapa ei muuta tulosta (Kesken kasvaa vastatessa ja
    ohittaessa, ei siirtyessä).
12. Annettu käyttöjärjestelmän asetus "vähennä liikettä" päällä. Kun oikea
    vastaus on annettu. Niin odotus näkyy silti (täyttö neljänä askeleena
    ilman liukumista, design 3.5), ja siirtyminen tapahtuu samassa ajassa
    (4 s).
13. Annettu ruudunlukija. Kun oikea vastaus annetaan kysymyksessä 1–9. Niin
    ruudunlukija kertoo, että seuraava kysymys tulee itsestään (ennen
    siirtymistä); kysymyksessä 10 sitä ei sanota; uusi kysymys ilmoitetaan
    kuten nykyisin.
14. Annettu Macilla Chromella pelattu täysi kierros, kaikki oikein. Kun lapsi
    ei napauta mitään vastausten jälkeen. Niin kysymykset 2–10 tulevat
    itsestään, ja 10. kysymyksen jälkeen odottaa `Katso tulos`. Mittaus
    kirjataan: selain, suunta, ja kesto kellolla vastausnapautuksesta
    seuraavan kysymyksen ilmestymiseen (tavoite 4 s).
15. Annettu SEI-46 (Matikka), SEI-47 (Sanat) ja SEI-48 (Espanja) valmiina.
    Kun vertaan kolmen pelin automaattista siirtymistä (kesto, painikkeen
    ulkoasu, Seuraava-painikkeen ja ruudunlukijan käytös,
    peruutustilanteet). Niin ne ovat samat; poikkeama kirjataan perusteineen.
    Poikkeuksia, jotka johtuvat pelin sisällöstä eivätkä ole poikkeamia:
    Espanjassa ei ole kuvaa eikä voittoääntä; väärä vastaus ei saa uutta
    yritystä.

Avoimet kysymykset (ei omistajalle; designerille ja arkkitehdille):
1. Kun lapsi poistuu etusivulle odotuksen aikana ja palaa: oletus
   (kriteeri 10) Seuraava odottaa napautusta; design sei-4.md kohta 3.5 on
   samaa mieltä. Sama kysymys on auki SEI-47:ssä.

Riskit:
- iPad (kuten SEI-46): Espanja → Suomi -suunnassa seuraava kysymyssana
  luetaan ajastimesta, ei napautuksesta. iPad-Safari voi estää puheen, jota ei
  ole käynnistetty napautuksesta. Jos estää, espanjan sana näkyy tekstinä mutta
  jää lukematta; Kuuntele toimii napautuksesta. Lapsi, joka ei vielä osaa
  lukea espanjaa ääneen, ei kuule sanaa ennen kuin painaa Kuuntele, joten
  peli ei kaadu mutta kuulemisharjoitus puuttuu (Matikassa lasku näkyy
  tekstinä; Sanojen Keskitasolla ja Vaikealla ongelma on vakavampi). Peli ei
  saa jäädä jumiin (SEI-1 kriteeri 5). Tarkistetaan iPadilla SEI-2:n
  iPad-tarkistuksen yhteydessä; ei tarkistettu. Suomi → Espanja -suunta ei
  ole tämän riskin alla, koska uutta kysymystä ei lueta.
- Kiinteä 4 s voi tuntua liian nopealta tai hitaalta eri lukutaitoisille
  (sama riski kuin SEI-46:ssa ja SEI-47:ssä).
- Täysi oikea kierros ilman napautuksia vie 9 × 4 s = 36 s odotusta
  (design kohta 6); ei omistajan kysymys, mutta kirjataan mittauksessa
  (kriteeri 14).

### SEI-49 — Sanat: loppuruudun Kuuntele puhuu sujuvaa suomea
Tila: done
APPROVED 2026-10-26 (kierros 2), julkaistu commit 375b0a1. Havainto
(pääistunto, 2026-10-26 ~15.00): julkaistu sanat-logic.js antaa endTexts(9,1,0)
"Hienoa! 9 sanaa heti oikein. 1 sana oikein uudella yrityksellä. Hyvää työtä!",
(0,0,10) "Kierros valmis. 10 sanaa ohitettu. Harjoittelemalla oppii!", (10,0,0)
ennallaan. Q39 (omistaja, Mac, 2026-10-26): "1 sana oikein uudella yrityksellä --> tää ei
oo suomea vielä". Rivin sanamuoto kysytty (Q40); koskee myös ruudun riviä.
Päätös Q41 (omistaja, 2026-10-26): b-rivi ruudulla ja ääneen: b = 1 →
"Vain 1 sana meni ensin väärin", b ≥ 2 → "{b} sanaa meni ensin väärin".
Muut rivit ja täydellisen tuloksen puhe ennallaan.
Q41-muutos APPROVED 2026-10-26, julkaistu commit fa20bb2. Kriteerien 1–3 ja 10
vanha sanamuoto ("oikein uudella yrityksellä") on Q41:n korvaama. Laajennus
(pääistunnon pyytämä, ei Q41:ssä): ruudunlukijan loppuilmoitus käyttää samaa
b-rivin tekstiä. Avoimet jäljet: ruudunlukijan loppuilmoitukselle ei ole testiä;
docs/design/sei-3.md/.html näyttävät vielä vanhan sanamuodon.
Havainto (pääistunto, 2026-10-26 ~15.25): julkaistu endTexts(9,1,0) "Hienoa! 9
sanaa heti oikein. Vain 1 sana meni ensin väärin. Hyvää työtä!", (4,3,3) "…3
sanaa meni ensin väärin. 3 sanaa ohitettu…". Kriteeri 11 (omistaja, Mac, 2026-10-26, Q42): "ok".
Perustelu: havainto: loppuruudun puhe "Heti oikein 9. Uudella yrityksellä 1."
ei ole suomea, vaikka ruudun rivit ("9 sanaa heti oikein") ovat; puhe pitää
sanoa samoin kuin rivit on kirjoitettu.
Riippuvuus: SEI-3, SEI-8 (loppuruutu; molemmat done).
Havainto (omistaja, 2026-10-26 noin klo 14.45, Mac, julkaistu Sanat, Harry
Potter, Keskitaso): loppuruudussa 9 / 10, rivit "9 sanaa heti oikein" ja
"1 sana oikein uudella yrityksellä", teksti "Hyvää työtä!". Kuuntele-painike
sanoi: "Hienoa! Heti oikein 9. Uudella yrityksellä 1. Hyvää työtä!" Omistaja
sanoin: "tässä tulee jotain hassua, kun se sanoo 'hienoa, heti oikein 9,
uudella yrityksellä yksi, hyvää työtä' Ei oo suomea tuo".
Lähtötaso (luettu koodista, ei havainto): `app/src/games/sanat-logic.js`
`endTexts()` rakentaa puheen muotoon "Heti oikein ${a}. Uudella yrityksellä
${b}. Ohitettu ${c}."; koodin kommentin mukaan numerot jätettiin
taivuttamatta, jotta ääni ei sanoisi "yksi sanan". Ruudun rivit samassa
funktiossa ovat oikeaa suomea.
Ehdotettu suunta (pääsession ehdotus, ei päätös; toteutustavan päättää
arkkitehti): puhe lukee samat rivit kuin ruutu, esim. "Hienoa! 9 sanaa heti
oikein. 1 sana oikein uudella yrityksellä. Hyvää työtä!" Luku + perusmuotoinen
sana/sanaa on oikeaa suomea eikä vaadi taivutusta.
Kriteerit (ruudun rivit, otsikko ja lopputeksti eivät muutu; luvut a = heti
oikein, b = oikein uudella yrityksellä, c = ohitettu, a + b + c = 10):
1. Annettu loppuruutu, jossa a = 9, b = 1, c = 0 (taso "hyvä"). Kun painan
   Kuuntele. Niin puhuttu teksti on täsmälleen "Hienoa! 9 sanaa heti oikein.
   1 sana oikein uudella yrityksellä. Hyvää työtä!" Tekstissä ei esiinny
   "Heti oikein 9" eikä "Uudella yrityksellä 1".
2. Annettu loppuruutu, jossa a = 7, b = 1, c = 2 (taso "hyvä", ohitettuja).
   Kun painan Kuuntele. Niin puhuttu teksti on täsmälleen "Hienoa! 7 sanaa
   heti oikein. 1 sana oikein uudella yrityksellä. 2 sanaa ohitettu. Hyvää
   työtä!"
3. Annettu loppuruutu, jossa a = 4, b = 3, c = 3 (taso "valmis"). Kun painan
   Kuuntele. Niin puhuttu teksti on täsmälleen "Kierros valmis. 4 sanaa heti
   oikein. 3 sanaa oikein uudella yrityksellä. 3 sanaa ohitettu.
   Harjoittelemalla oppii!"
4. Annettu loppuruutu, jossa a = 1, b = 0, c = 9 (yksikkö ja useita).
   Kun painan Kuuntele. Niin puhuttu teksti on täsmälleen "Kierros valmis.
   1 sana heti oikein. 9 sanaa ohitettu. Harjoittelemalla oppii!" (yksikkö
   "1 sana", monikko "9 sanaa"; rivi b puuttuu, koska b = 0).
5. Annettu loppuruutu, jossa a = 0, b = 0, c = 10. Kun painan Kuuntele. Niin
   puhuttu teksti on "Kierros valmis. 10 sanaa ohitettu. Harjoittelemalla
   oppii!" (nykyinen käytös, ettei "0 sanaa heti oikein" -riviä puhuta,
   säilyy; ks. avoin kysymys 1).
6. Annettu loppuruutu, jossa a = 10 (taso "täydellinen"). Kun painan
   Kuuntele. Niin puhuttu teksti on täsmälleen sama kuin ennen muutosta:
   "Täydellinen tulos! Kaikki 10 sanaa heti oikein. Olet tosi hyvä lukija!"
7. Annettu mikä tahansa kriteerien 1–5 loppuruutu. Kun vertaan ruudulla
   näkyviä rivejä ja puhuttua tekstiä. Niin jokainen ruudun rivi (a aina
   paitsi kriteerin 5 tapauksessa puheessa, b ja c vain kun >= 1) esiintyy
   puheessa samoin sanoin kuin ruudulla, samassa järjestyksessä.
8. Annettu sama loppuruutu, jonka puhe käynnistyy toisesta paikasta (Kuuntele
   tai, jos loppuruutu lukee itsensä ääneen avautuessaan, se). Kun kuuntelen
   molemmat. Niin puhe on sama; korjaus ei koske vain yhtä polkua.
9. Annettu Matikan loppuruutu pistemäärillä 10, 9, 4 ja 0. Kun painan
   Kuuntele jokaisella. Niin puhe on muuttumaton: 10 "Täydellinen tulos! Sait
   10 oikein. Olet matikkamestari!"; 9 "Hienoa! Sait 9 oikein. Hyvin
   laskettu!"; 4 "Kierros valmis. Sait 4 oikein. Harjoittelemalla oppii!";
   0 "Kierros valmis. Harjoittelemalla oppii!"
10. Annettu Sanojen loppuruutu kriteerien 1–6 luvuilla. Kun katson ruutua.
    Niin otsikko, rivit, tulos "a / 10", tähdet ja lopputeksti ovat samat
    kuin ennen muutosta (korjaus koskee vain puhetta).
11. Annettu Macilla Chromella julkaistu Sanat, Harry Potter, Keskitaso,
    kierros jossa 9 oikein heti ja 1 uudella yrityksellä (omistajan havainto).
    Kun painan Kuuntele. Niin kuuluva puhe on kriteerin 1 mukainen; havainto
    kirjataan tehtävään (selain, aika, mitä kuului).
Avoimet kysymykset (ei omistajalle; arkkitehdille):
1. Puhutaanko rivi "0 sanaa heti oikein", kun a = 0? Oletus: ei, kuten nyt
   (kriteeri 5); ruudulla rivi näkyy aina.
2. Luetaanko luku + sana/sanaa äänellä luontevasti kaikilla käytössä olevilla
   fi-äänillä (Satu, Eloquence-sarja; SEI-45)? Oletus: kyllä; todennetaan
   kriteerillä 11, ei muilla äänillä.
Riskit:
- Kommentin mukaan juuri taivutus ("yksi sanan") oli syynä nykyiseen muotoon;
  perusmuotoinen "1 sana" ei taivu, mutta äänen lukutapa on kuultava
  (kriteeri 11).
- Sama tekstirakenne (numero + sana) on ruudun riveissä; jos ruutu muuttuu,
  puhe voi taas erkaantua. Kriteeri 7 vahtii tätä.
Ei tässä tehtävässä (ehdotus, ei pyydetty): muiden Sanojen puheiden
(sanaäänet, tavut, virheen puhe) kielenhuollon läpikäynti; tehdään vain, jos
joku kuulee niissä virheen.

### SEI-7 — Sana: virheen jälkeen koko sanaa ei tyhjennetä, askelpalautin kaikilla tasoilla, ohitus
Tila: done
Perustelu: lähtötaso: väärä yritys tyhjentää koko sanan, "Aloita alusta"
on ainoa korjaus ja Vaikealla tasolla ei ole askelpalautinta; sanaa ei voi
ohittaa.
Riippuvuus: SEI-3. Designer päättää tarkan tavan.
Huomio (2026-10-26): ulkoasu `docs/design/sei-3.md` hyväksytty (Q26: "ok ja
jatka"). Ohitetun sanan tapa (Q27, omistaja: "joo", tulkittu oletukseksi,
design E5): Ohita-napautuksen jälkeen ohitettu sana näytetään ja luetaan
ääneen ensin (`Ohitettu.` / `Sana on KISSA.`, ääneen `Sana on kissa.`), ja
seuraava sana tulee vasta Seuraava-napautuksesta. Kriteerin 3 sanamuoto
"seuraava sana tulee" tarkoittaa siis Ohita ja sen jälkeen Seuraava.
Ohitettu sana ei siirry itsestään eteenpäin (ks. SEI-47).
Kriteerit:
1. Annettu sana KISSA ja olen valinnut kirjaimet KISTA. Kun tarkistus
   kertoo virheestä. Niin oikein olevat kirjaimet (K, I, S, A) eivät
   katoa ruuduista ennen kuin korjaan; vain väärä kohta korjataan.
2. Annettu kirjain väärässä paikassa kaikilla kolmella tasolla (Helppo,
   Keskitaso, Vaikea). Kun painan askelpalautinta. Niin viimeksi valittu
   kirjain poistuu (ja sen laatta tulee takaisin valittavaksi Helpolla
   ja Keskitasolla).
3. Annettu sana johon en osaa vastata. Kun painan Ohita. Niin seuraava
   sana tulee ja ohitus merkitään ohitetuksi (ei oikeaksi), ja ohitetut
   näkyvät loppuruudussa (ks. SEI-8).

### SEI-8 — Sana: pisteet ja tulos kuvaavat myös virheitä
Tila: done
Perustelu: lähtötaso: pisteet lasketaan vain oikeista, joten tulos on
aina 10/10 eikä edistymisestä saa tietoa.
Riippuvuus: SEI-3, SEI-7.
Huomio (2026-10-26): ulkoasu `docs/design/sei-3.md` (loppuruutu, kohta 3.7)
hyväksytty omistajalla (Q26: "ok ja jatka").
Kriteerit:
1. Annettu sana johon vastaan väärin ensin kaksi kertaa ja sitten oikein.
   Kun kierros päättyy. Niin sana ei ole laskettu "ensimmäisellä
   yrityksellä oikein" -sanaksi, ja tulos kertoo erikseen ensi yrityksellä
   oikein menneet ja yrityksiä vaatineet.
2. Annettu kierros jossa ohitan 3 sanaa. Kun kierros päättyy. Niin
   loppuruutu kertoo, että 3 ohitettiin.
3. Annettu kierros jossa kaikki sanat menevät ensi yrityksellä oikein.
   Kun kierros päättyy. Niin tulos on 10/10 ja eroaa kohdan 1 tuloksesta.

### SEI-9 — Espanja: sanalistan käännökset oikein
Tila: done
Perustelu: lähtötaso: käännösvirheitä (por favor / "ole hyvä", buenas
tardes / "hyvää iltaa"); lapset oppisivat väärän sanan.
Riippuvuus: SEI-4. Tarvitsee espanjaa osaavan tarkistajan (ks. K3).
Huomio (2026-10-26): ulkoasu ja käännöstaulukko `docs/design/sei-4.md`
(kohta 5, SEI-9) hyväksytty omistajalla (Q31). Tarkistaja: espanjaa osaavaa
ei ole nimetty (K3), joten omistaja on hyväksynyt käännökset tarkistajana
(Q32: "ok", 2026-10-26; pohjana designerin sanakirjatarkistus
fi.wiktionary.org 2026-10-26). Hyväksytyt suomennokset: adiós = näkemiin
(ennen "moi moi / hei hei"), buenas tardes = hyvää iltapäivää (ennen "hyvää
iltaa"), por favor = ole kiltti (ennen "ole hyvä"). Muut 15 paria ennallaan.
Kriteerit:
1. Annettu 18 nykyistä sanaparia. Kun tarkistaja käy ne läpi. Niin jokaisen
   parin suomi ja espanja tarkoittavat samaa (tarkistajan hyväksyntä
   kirjataan tehtävään). Kirjaus: omistaja tarkistajana, Q32, 2026-10-26,
   kolme muutettua paria hyväksytty ja 15 ennallaan (ks. Huomio).
2. Annettu pari "buenas tardes" (nykyisin suomeksi "hyvää iltaa", rivi
   198). Kun kysymys näytetään. Niin suomenkielinen vastine on
   tarkistajan hyväksymä.
3. Annettu pari "por favor" (nykyisin suomeksi "ole hyvä", rivi 201). Kun
   kysymys näytetään. Niin suomenkielinen vastine on tarkistajan hyväksymä.
4. (Täsmennys 2026-10-26, Q32.) Annettu hyväksytyt suomennokset. Kun pelaan
   kierroksen, jossa pari tulee kysymykseksi tai vaihtoehdoksi (molemmat
   suunnat). Niin "adiós" on suomeksi `näkemiin`, "buenas tardes" on `hyvää
   iltapäivää` ja "por favor" on `ole kiltti`; vanhoja muotoja (`moi moi /
   hei hei`, `hyvää iltaa`, `ole hyvä`) ei näy missään vaihtoehdossa tai
   kysymyksessä. Kriteerit 2 ja 3 täsmentyvät näin: tarkistajan hyväksymä
   vastine on yllä oleva.

### SEI-10 — Espanja: palaute väärästä ja "Seuraava" ilman vastausta
Tila: done
Perustelu: lähtötaso: väärästä vastauksesta kerrotaan vain värillä (punainen
/ vihreä) ilman tekstiä tai ääntä, ja "Seuraava" siirtää eteenpäin
vastaamatta. Huom: brief sanoo "ei palautetta väärästä"; koodin
mukaan värit on, tekstiä ei.
Riippuvuus: SEI-4. Designer päättää tavan.
Huomio (2026-10-26): ulkoasu `docs/design/sei-4.md` hyväksytty omistajalla
(Q31: "ok"). Väärä: `Ei ihan.` / `Oikea vastaus on …`; vastaamatta eteenpäin
vain `Ohita`, joka näyttää oikean vastauksen ja lasketaan ohitetuksi
(design kohdat 3.4, 3.6, 3.7).
Kriteerit:
1. Annettu väärä vastaus. Kun valitsen sen. Niin näen myös tekstin, joka
   kertoo oikean vastauksen (väri ei ole ainoa tieto).
2. Annettu kysymys johon en ole vastannut. Kun painan Seuraava. Niin
   kysymys ei lasketa oikeaksi, ja se näkyy tuloksessa ohitettuna;
   kierroksen lopussa teksti kertoo montako ohitettiin.
3. Annettu kierros jossa ohitin 4 kysymystä ja vastasin 6 oikein.
   Kun kierros päättyy. Niin tulos on 6/10 ja ohitukset kerrotaan erikseen;
   tähteä ei tule, koska 6 < 8.

## D. Ehdotukset (EI hyväksyttyjä vaatimuksia; odottavat K1:n vastausta)

Pääsession ehdotukset omistajalle (brief, 2026-10-22). Omistaja ei ole
päättänyt yhtäkään. Tehtävät on kirjattu valmiiksi, jotta valinta on
helppo; yhtäkään ei aloiteta ennen kuin omistaja on valinnut sen (K1).
Esimerkkiluvut kriteereissä ovat esimerkkejä, eivät päätöksiä.

### D1. Yhteinen pohja

#### SEI-11 — Pelaajaprofiilit (ehdotus)
Tila: todo
Perustelu: kaksi eri tasoista lasta; edellytys edistymisen muistamiselle.
Riippuvuus: K2.
Kriteerit:
1. Annettu kaksi profiilia, A ja B. Kun A ansaitsee tähden ja B avaa
   sovelluksen. Niin B näkee omat tähtensä, ei A:n.
2. Annettu sovellus avataan uudelleen. Kun valitsen profiilin A. Niin
   sovellus on A:n viimeksi käyttämällä tasolla ja teemalla.

#### SEI-12 — Yhteiset palkinnot ja tarrakokoelma (ehdotus)
Tila: todo
Perustelu: nyt vain Espanja muistaa tähtiä; kolmella pelillä kolme
erilaista palkintoa.
Riippuvuus: SEI-11, K2.
Kriteerit:
1. Annettu lapsi on pelannut kaikki kolme peliä. Kun avaan palkintonäkymän.
   Niin näen yhdellä sivulla palkinnot kaikista kolmesta pelistä.
2. Annettu palkinto jonka sain eilen. Kun avaan sovelluksen tänään samalla
   laitteella. Niin se on edelleen näkyvissä.

#### SEI-13 — Virheiden kertaus, myös seuraavina päivinä (ehdotus)
Tila: todo
Perustelu: väärin menneet asiat kannattaa harjoitella uudelleen.
Riippuvuus: SEI-11.
Kriteerit:
1. Annettu vastasin eilen väärin lasku 7 + 8. Kun aloitan kertauksen
   tänään. Niin 7 + 8 on kertaustehtävien joukossa.
2. Annettu olen vastannut kertaustehtävään oikein. Kun aloitan kertauksen
   seuraavana päivänä. Niin tehtävä ei enää ole kertauksessa tai se on
   harvemmin tarjolla (peruste tarkentuu suunnittelussa).

#### SEI-14 — Mukautuva vaikeustaso (ehdotus)
Tila: todo
Perustelu: lapset ovat eri tasoilla; taso ei saa olla vain käsin valittu.
Riippuvuus: SEI-11.
Kriteerit:
1. Annettu lapsi on vastannut 10 / 10 oikein kolmella peräkkäisellä
   kierroksella. Kun aloitan seuraavan kierroksen. Niin sovellus ehdottaa
   vaikeampaa tasoa, ja lapsi voi hyväksyä tai jäädä nykyiselle.
2. Annettu kierros jolla oikein on alle puolet. Kun aloitan seuraavan.
   Niin sovellus ehdottaa helpompaa tai jäämistä; taso ei muutu itsestään
   ilman että lapsi näkee sen.

#### SEI-15 — Päivän tavoite (ehdotus)
Tila: todo
Perustelu: tuo säännöllisyyttä; ei ole nykyisessä toiminnassa.
Riippuvuus: SEI-11, SEI-12.
Kriteerit:
1. Annettu päivän tavoite on 3 kierrosta. Kun olen pelannut 2. Niin näen
   kuinka paljon on vielä jäljellä.
2. Annettu tavoite on täynnä. Kun pelaan 3. kierroksen. Niin saan
   palkinnon, jota ei saa uudelleen samana päivänä.

#### SEI-16 — Vanhemman näkymä (ehdotus)
Tila: todo
Perustelu: vanhempi näkee kummankin lapsen tilanteen.
Riippuvuus: SEI-11.
Kriteerit:
1. Annettu lapset ovat pelanneet. Kun avaan vanhemman näkymän. Niin näen
   kummankin lapsen viimeksi pelatun päivän ja kierrosten tulokset
   pelikohtaisesti.
2. Annettu lapsi avaa sovelluksen. Kun yrittää päästä vanhemman näkymään.
   Niin pääsy vaatii jotain, mitä 1.-luokkalainen ei vahingossa tee (tapa
   tarkentuu suunnittelussa).

#### SEI-17 — Vanhemman omat sanalistat (ehdotus)
Tila: todo
Perustelu: kotona harjoiteltavat sanat vaihtelevat (koulun lista).
Riippuvuus: SEI-16, K3.
Kriteerit:
1. Annettu vanhemman lisäämä sanalista "Viikon 5 sanat" (3 sanaa). Kun
   valitsen sen Sana- tai Espanja-pelissä. Niin kysymykset tulevat vain
   niistä 3 sanasta.
2. Annettu sana johon ei ole kuvaa. Kun peli näyttää sen. Niin peli toimii
   (puuttuva kuva ei estä pelaamista).

#### SEI-18 — Kotinäytöltä avaaminen ja toiminta ilman verkkoa (ehdotus)
Tila: todo
Perustelu: iPadilla avaaminen yhdellä napautuksella; peli matkalla.
Riippuvuus: SEI-1.
Kriteerit:
1. Annettu sovellus on lisätty iPadin kotinäytölle. Kun napautan kuvaketta.
   Niin sovellus avautuu ilman selaimen osoiterivin hallintaa.
2. Annettu laite ilman verkkoyhteyttä (lentokonetila), sovellus on
   avattu verkossa vähintään kerran. Kun avaan sovelluksen ja pelaan
   kierroksen kustakin pelistä. Niin kierros on pelattavissa loppuun.

### D2. Matikka

#### SEI-20 — Kuvalaskut apuvälineenä (ehdotus)
Tila: todo
Perustelu: apu laskemiseen; lapset osaavat lukea, joten ei ole ehto.
Riippuvuus: SEI-2.
Kriteerit:
1. Annettu lasku 3 + 4 Eskari-tasolla. Kun painan "näytä kuva". Niin
   näen 3 ja 4 esinettä, mutta vastaus 7 ei vielä näy.

#### SEI-21 — Puuttuva luku (ehdotus)
Tila: todo
Perustelu: harjoittaa laskujen välistä yhteyttä.
Riippuvuus: SEI-2.
Kriteerit:
1. Annettu tehtävä "3 + ? = 7". Kun vastaan 4. Niin vastaus on oikein;
   vastaus 10 on väärin.

#### SEI-22 — Kymppiparit (ehdotus)
Tila: todo
Perustelu: kymmenen osat ovat yhteen- ja vähennyslaskun perusta.
Riippuvuus: SEI-2.
Kriteerit:
1. Annettu luku 6. Kun peli kysyy, paljonko puuttuu kymppiin. Niin 4 on
   oikein; kaikki muut luvut ovat väärin.

#### SEI-23 — Vertailu (ehdotus)
Tila: todo
Perustelu: lukujen suuruusjärjestys.
Riippuvuus: SEI-2.
Kriteerit:
1. Annettu "7 ? 9". Kun valitsen "<" (pienempi kuin). Niin vastaus on
   oikein; ">" ja "=" ovat väärin.
2. Annettu "8 ? 8". Kun valitsen "=". Niin vastaus on oikein.

#### SEI-24 — Lukusuora (ehdotus)
Tila: todo
Perustelu: lukujen paikan hahmottaminen.
Riippuvuus: SEI-2.
Kriteerit:
1. Annettu tehtävä "Missä on 13?" lukusuoralla 0–20. Kun napautan kohtaa
   13. Niin oikein; kohta 12 on väärin.

#### SEI-25 — Kertotaulujen valinta (ehdotus)
Tila: todo
Perustelu: koulu käy kertotaulut yksi kerrallaan.
Riippuvuus: SEI-2.
Kriteerit:
1. Annettu valitsen vain taulut 3 ja 7. Kun pelaan kierroksen. Niin
   jokaisessa tehtävässä toinen tekijä on 3 tai 7 eikä yhdessäkään ole
   muita tauluja.

#### SEI-26 — Jakolasku (ehdotus)
Tila: todo
Perustelu: seuraava askel kertolaskusta.
Riippuvuus: SEI-2.
Kriteerit:
1. Annettu jakolaskukierros. Kun pelaan 10 tehtävää. Niin jokainen
   tehtävä menee tasan (ei jakojäännöstä; esim. 12 ÷ 3 = 4).

#### SEI-27 — Rahalaskut (ehdotus)
Tila: todo
Perustelu: arjen laskeminen.
Riippuvuus: SEI-2.
Kriteerit:
1. Annettu tehtävä "Pulla maksaa 3 €, annat 5 €. Paljonko saat takaisin?"
   Kun vastaan 2 €. Niin oikein; 3 € on väärin.

#### SEI-28 — Sanalliset tehtävät (ehdotus)
Tila: todo
Perustelu: lukeminen ja laskeminen yhdessä; osa pelaajista on lukenut vasta
vähän aikaa.
Riippuvuus: SEI-2.
Kriteerit:
1. Annettu tehtävä "Liisalla on 5 omenaa. Hän saa 3 lisää. Montako omenaa
   on nyt?" Kun vastaan 8. Niin oikein.
2. Annettu sama tehtävä. Kun painan kuuntelu. Niin teksti luetaan
   ääneen.

#### SEI-29 — Vapaaehtoinen aikahaaste (ehdotus)
Tila: todo
Perustelu: kiinnostava osalle lapsista; ei saa painostaa muita.
Riippuvuus: SEI-2.
Kriteerit:
1. Annettu aikahaaste ei ole päällä (oletus). Kun pelaan kierroksen. Niin
   missään ei näy ajastinta.
2. Annettu aikahaaste on päällä. Kun aika loppuu kesken kierroksen. Niin
   tulos kertoo kuinka monta tehtävää ehdin.

### D3. Sana

#### SEI-30 — Tavupalat (ehdotus)
Tila: todo
Perustelu: lukemisen sujuvuus on Sanaseikkailun ydin.
Riippuvuus: SEI-3.
Kriteerit:
1. Annettu sana KISSA, tavut KIS ja SA palasina. Kun napautan KIS ja
   sitten SA. Niin oikein; järjestys SA, KIS on väärin.

#### SEI-31 — Lue ja valitse kuva (ehdotus)
Tila: todo
Perustelu: ymmärtävä lukeminen ilman ääntä.
Riippuvuus: SEI-3.
Kriteerit:
1. Annettu sana KALA tekstinä ilman ääntä ja neljä kuvaa. Kun valitsen
   kalan kuvan. Niin oikein; muut kuvat väärin.

#### SEI-32 — Lauseiden rakentaminen (ehdotus)
Tila: todo
Perustelu: sanasta lauseeseen.
Riippuvuus: SEI-3.
Kriteerit:
1. Annettu lause "KISSA SYÖ KALAA" sanapaloina sekaisin. Kun järjestän
   ne oikein. Niin oikein; väärä järjestys ei ole.

#### SEI-33 — Kirjainkohtainen virhepalaute (ehdotus)
Tila: todo
Perustelu: lapsi näkee mikä kirjain meni väärin. (Päällekkäinen SEI-7:n
kanssa; päätetään yhdessä.)
Riippuvuus: SEI-3, SEI-7.
Kriteerit:
1. Annettu sana KISSA ja vastaus KISTA. Kun tarkistus tehdään. Niin
   kirjaimet 1–3 ja 5 näkyvät oikeina ja kirjain 4 (T) vääränä.

#### SEI-34 — Lisää teemoja (ehdotus)
Tila: todo
Perustelu: nyt vain Normaali ja Harry Potter.
Huomio (2026-10-27): omistajan pyyntö lisätä sanoja nykyisiin listoihin on
SEI-50 ja SEI-51; ne eivät ole tämä tehtävä (tämä = uudet teemat).
Riippuvuus: SEI-3.
Kriteerit:
1. Annettu uusi teema. Kun valitsen sen. Niin sanat tulevat vain siitä
   teemasta, ja teemat Normaali ja Harry Potter ovat edelleen valittavissa.

#### SEI-35 — Isot ja pienet kirjaimet (ehdotus)
Tila: todo
Perustelu: nyt kaikki sanat ovat isoilla kirjaimilla.
Riippuvuus: SEI-3.
Kriteerit:
1. Annettu valitsen pienet kirjaimet. Kun sana KISSA näytetään. Niin se
   näkyy "kissa" ja laatat ja aakkoset ovat pieniä; oikea vastaus on
   sama kirjainkoosta riippumatta.

### D4. Espanja

#### SEI-40 — Lisää aiheita (ehdotus)
Tila: todo
Perustelu: nyt vain tervehdykset ja värit (18 sanaa). Aiheet ehdotuksessa:
numerot, eläimet, perhe, ruoka, keho, viikonpäivät, fraasit. Järjestys
riippuu K3:sta.
Huomio (2026-10-27): omistajan pyyntö lisätä espanjan sanastoa (osio E)
absorboi viisi aihetta: numerot = SEI-52, eläimet = SEI-53, ruoka = SEI-54,
viikonpäivät = SEI-55, perhe = SEI-56 (omistaja valitsi ne, Q46, 2026-10-27).
Tähän tehtävään jäävät vain loput aiheet: keho ja fraasit, kun omistaja
valitsee ne; kriteerit 1–2 alla pätevät niihin kuten SEI-52:ssa.
Riippuvuus: SEI-4, SEI-9, K3.
Kriteerit (kullekin aiheelle erikseen, voi julkaista aihe kerrallaan):
1. Annettu uusi aihe. Kun valitsen sen. Niin kysymykset ja väärät
   vaihtoehdot tulevat vain siitä aiheesta ja aiheessa on vähintään 4
   sanaa (neljä vaihtoehtoa vaatii sen).
2. Annettu uusi aihe. Kun tarkistaja käy sen läpi. Niin jokainen pari on
   hyväksytty (kuten SEI-9).

#### SEI-41 — Kuuntele ja valitse kuva (ehdotus)
Tila: todo
Perustelu: opettelu ilman suomen kieltä välissä.
Riippuvuus: SEI-4.
Kriteerit:
1. Annettu espanjan sana "rojo" kuunneltavaksi ja neljä kuvaa. Kun
   valitsen punaisen. Niin oikein.

#### SEI-42 — Muistipeli (ehdotus)
Tila: todo
Perustelu: vaihtelua; sanan ja merkityksen yhdistäminen.
Riippuvuus: SEI-4.
Kriteerit:
1. Annettu korttiparit (espanjan sana ja suomi tai kuva). Kun käännän kaksi
   yhteen kuuluvaa. Niin ne jäävät auki; kaksi muuta kääntyvät takaisin.
2. Annettu kaikki parit löydetty. Kun peli päättyy. Niin näen
   siirtojen määrän.

#### SEI-43 — Oikeinkirjoitus aksentteineen (ehdotus)
Tila: todo
Perustelu: á, é, ñ, ¿ ja ¡ ovat osa kirjoitusasua.
Riippuvuus: SEI-4.
Kriteerit:
1. Annettu sana "adiós". Kun kirjoitan "adios". Niin tulos kertoo, että
   aksentti puuttui (ei pelkkä "väärin").
2. Annettu iPad. Kun kirjoitan aksenttimerkkejä. Niin ó, ñ, ¿ ja ¡ ovat
   valittavissa ilman iPadin pitkää painallusta.

#### SEI-44 — Puheentunnistus (ehdotus)
Tila: todo
Perustelu: lapsi sanoo sanan ääneen.
Riippuvuus: SEI-4. Selainten tuki vaihtelee eikä sitä ole tarkistettu
iPadilla.
Kriteerit:
1. Annettu laitteessa on puheentunnistus. Kun sanon "hola". Niin vastaus
   on oikein; kun sanon "adiós", väärin.
2. Annettu laitteessa ei ole puheentunnistusta. Kun avaan pelin. Niin
   tämä pelitapa ei ole tarjolla tai kertoo selvästi, ettei se toimi;
   muut pelitavat toimivat normaalisti.

---

## E. Lisäsisältö (omistajan pyyntö 2026-10-27)

Havainto/pyyntö (omistaja, 2026-10-27, sanatarkasti): "tää on nyt hyvä pohja.
Voidaanko lisätä kontenttia ainakin sanoihin (normi + harry potter) ja myös
espanjaan lisää kontenttia, jotka sopii A1-kielen harjoitteluun 1-2 luokalla".
Tavoite ja kenelle: 1.–2.-luokkalaiset pelaavat samoja sanoja kierroksesta
toiseen, koska listat ovat lyhyet; omistaja haluaa lisää sanoja Sanojen
kahteen listaan (Normaali, Harry Potter) ja lisää Espanjan sanastoa, joka
sopii espanjan A1-tason harjoitteluun 1.–2. luokalla. Ongelmaa "liian vähän
sisältöä" ei ole nähty käytössä; omistajan oma pyyntö on tämän perustelu.

Lähtötaso (luettu 2026-10-27, `app/src/games/sanat-logic.js` ja
`app/src/games/espanja-logic.js`, main-haara commit 77b8b9f):
- Sanat: Normaali `WORDS` 24 sanaa, Harry Potter `HP_WORDS` 20 sanaa; jokaisella
  sanalla kuva (emoji) ja lyhyt suomenkielinen vihje; kierros 10 sanaa
  (`MAX_WORDS`). Pisin Normaali-sana 7 kirjainta (AURINKO, BANAANI, JÄÄTELÖ),
  pisin HP-sana 10 (TAIKASAUVA, VIISTOKUJA, LOHIKÄÄRME, TAIKAJUOMA). Pisin
  nykyinen vihje 23 merkkiä ("Taikuutta osaava nainen").
- Espanja: 18 paria, kaksi aihetta (tervehdys 8, väri 10); pari = es, fi,
  topic; kierros 10 kysymystä arvotaan kaikista parista; väärät vaihtoehdot
  samasta aiheesta (siksi aiheessa vähintään 4 paria); pisin espanjankielinen
  ilmaus 2 sanaa.

Suhde aiempiin ehdotuksiin (ei kaksoiskappaleita):
- SEI-40 (Espanja: lisää aiheita) on absorboitu: omistajan pyyntö 2026-10-27
  toteuttaa sen kaksi ensimmäistä aihetta (SEI-52, SEI-53) K3:n järjestyksessä
  (Q7), ja omistajan vastaus Q46 lisäsi kolme (ruoka SEI-54, viikonpäivät
  SEI-55, perhe SEI-56). SEI-40:een jää vain keho ja fraasit, kunnes omistaja
  valitsee ne.
- SEI-34 (Sanat: lisää teemoja) EI ole sama asia: omistaja pyysi lisää sanoja
  kahteen olemassa olevaan teemaan, ei uusia teemoja. SEI-34 pysyy erillisenä
  ehdotuksena.

Suunnittelutarve: sanat, vihjeet ja käännökset ovat tekstiä (copy). Ehdotus
(pm, ei päätös): designer laatii kunkin listan taulukkona `docs/design/`-
hakemistoon (sana, kuva, vihje / es, fi, aihe) ja omistaja hyväksyy sen ennen
arkkitehtia, kuten SEI-9:ssä (Q32). Ulkoasu ei muutu.

### SEI-50 — Sanat: lisää sanoja Normaali-listaan
Tila: review
Perustelu: omistaja pyysi lisää sanoja ("normi"); 24 sanan lista toistuu
10 sanan kierroksilla nopeasti.
Riippuvuus: SEI-3 (done). Sisällön tarkistus (ks. kriteeri 8).
Kriteerit (määrä: omistaja vastasi E1:een, Q45; pituusraja on oletus, ei
kysytty, E4):
1. Annettu Normaali-lista. Kun lasken sanat. Niin sanoja on vähintään 44
   (vähimmäismäärä: 24 nykyistä + vähintään 20 uutta; enemmän saa olla, Q45),
   kaikki 24 nykyistä sanaa (KISSA … TULI) ovat tallella samoilla kuvilla ja
   vihjeillä, ja designerin ehdottama lopullinen sanamäärä on kirjattu
   tehtävään.
2. Annettu Normaali- ja Harry Potter -listat yhdessä. Kun vertaan sanoja.
   Niin yksikään sana ei esiinny kahdesti (ei samaa listassa eikä listojen
   välillä).
3. Annettu jokainen uusi sana. Kun tarkistan merkit ja pituuden. Niin sana on
   yksi sana (ei välilyöntiä eikä väliviivaa), vain kirjaimia A–Z, Å, Ä, Ö
   (Vaikean tason aakkoset), ja pituus 3–7 kirjainta (oletus: pisin nykyinen
   Normaali-sana on 7).
4. Annettu jokainen uusi sana. Kun luen vihjeen. Niin vihje on suomea, enintään
   30 merkkiä (oletus; pisin nykyinen 23), ei sisällä itse sanaa eikä sen
   vartaloa (esim. vihje sanalle KAKKU ei sisällä "kakku"), ja sopii
   1.–2.-luokkalaiselle.
5. Annettu jokainen uusi sana. Kun katson sen kuvaa Macilla Chromessa. Niin
   kuva näkyy kuvana (ei tyhjänä laatikkona) ja esittää sanaa yksiselitteisesti
   (tarkistaja kirjaa jokaisen). Vanhemmalla iPadilla kuvan puuttuminen on
   tunnettu riski (ei tarkistettu); sovellus ei kaadu, vaikka kuva puuttuu.
6. Annettu jokainen uusi sana ja tavutus päällä. Kun avaan sanan. Niin tavut
   ovat suomen tavutussäännön mukaiset (esim. KIS-SA, AU-TO); tavutus kirjataan
   tehtävään sana kerrallaan. Sana, jonka tavutus tulee väärin, jätetään pois
   tai ilmoitetaan arkkitehdille; sitä ei hyväksytä sellaisenaan.
7. Annettu 5 kierrosta Normaali-listalla millä tahansa tasolla. Kun pelaan ne.
   Niin vähintään yksi uusi sana tulee vastaan, ja yhdessä kierroksessa ei ole
   samaa sanaa kahdesti (nykyinen toiminta säilyy).
8. Annettu uusien sanojen, kuvien ja vihjeiden taulukko. Kun tarkistaja käy sen
   läpi. Niin tarkistuksen tulos (tarkistaja, päivä, mitä tarkisti, sanakirja
   tai muu lähde sanakohtaisesti) on kirjattu tehtävään ennen julkaisua.
   Tarkistaja on Claude (designer-rooli), ei omistaja (Q47, 2026-10-27); omistaja
   näkee taulukon design-katselmoinnissa, mutta ei ole sen tarkistaja.

### SEI-51 — Sanat: lisää sanoja Harry Potter -listaan
Tila: review
Perustelu: omistaja pyysi lisää sanoja ("harry potter"); 20 sanan lista toistuu
10 sanan kierroksilla nopeasti.
Riippuvuus: SEI-3 (done). Sisällön tarkistus (ks. kriteeri 8).
Kriteerit (määrä: omistaja vastasi E1:een, Q45; nimet ja pituusraja ovat
oletuksia, ei kysytty, E4):
1. Annettu Harry Potter -lista. Kun lasken sanat. Niin sanoja on vähintään 40
   (vähimmäismäärä: 20 nykyistä + vähintään 20 uutta; enemmän saa olla, Q45),
   kaikki 20 nykyistä sanaa (JÄSTI … TAIKAJUOMA) ovat tallella samoilla kuvilla
   ja vihjeillä, ja designerin ehdottama lopullinen sanamäärä on kirjattu
   tehtävään.
2. Annettu Normaali- ja Harry Potter -listat yhdessä. Kun vertaan sanoja.
   Niin yksikään sana ei esiinny kahdesti.
3. Annettu jokainen uusi sana. Kun tarkistan sen lähteen. Niin sana on
   suomenkielinen termi suomennetuista Harry Potter -kirjoista (ei englanninkielinen
   alkuperäisnimi, ei oma keksintö), ja tarkistaja kirjaa lähteen jokaisesta
   (kirja tai sanakirja/luettelo ja päivä). Oletus, ei kysytty (E4): esineitä,
   paikkoja, otuksia ja käsitteitä; ei henkilöhahmojen nimiä.
4. Annettu jokainen uusi sana. Kun tarkistan merkit ja pituuden. Niin sana on
   yksi sana (ei välilyöntiä eikä väliviivaa), vain kirjaimia A–Z, Å, Ä, Ö, ja
   enintään 10 kirjainta (pisin nykyinen HP-sana on 10).
5. Annettu jokainen uusi sana. Kun luen vihjeen. Niin vihje on suomea, enintään
   30 merkkiä (pisin nykyinen 23), ei sisällä itse sanaa eikä sen vartaloa, ei
   paljasta kirjojen juonta ja sopii 1.–2.-luokkalaiselle (ei pelottava).
6. Annettu jokainen uusi sana. Kun katson sen kuvaa Macilla Chromessa. Niin
   kuva näkyy kuvana (ei tyhjänä laatikkona) ja sopii sanaan (tarkistaja kirjaa
   jokaisen). Jos sanalle ei ole sopivaa kuvaa, sana jätetään pois.
7. Annettu jokainen uusi sana ja tavutus päällä. Kun avaan sanan. Niin tavut
   ovat suomen tavutussäännön mukaiset; tavutus kirjataan tehtävään sana
   kerrallaan. Väärin tavuttuvaa sanaa ei hyväksytä sellaisenaan (kuten SEI-50
   kriteeri 6).
8. Annettu uusien sanojen, kuvien ja vihjeiden taulukko. Kun tarkistaja käy sen
   läpi. Niin tarkistuksen tulos (tarkistaja, päivä, mitä tarkisti, lähde
   sanakohtaisesti) on kirjattu tehtävään ennen julkaisua. Tarkistaja on Claude
   (designer-rooli), ei omistaja (Q47, 2026-10-27); omistaja näkee taulukon
   design-katselmoinnissa, mutta ei ole sen tarkistaja.
9. Annettu 5 kierrosta Harry Potter -listalla. Kun pelaan ne. Niin vähintään
   yksi uusi sana tulee vastaan, ja yhdessä kierroksessa ei ole samaa sanaa
   kahdesti.

### SEI-52 — Espanja: uusi aihe "numerot"
Tila: review
Perustelu: omistaja pyysi lisää espanjan sanastoa A1-tasolle 1.–2. luokalle;
numerot ovat K3:n (Q7) ensimmäinen lisäaihe.
Riippuvuus: SEI-4, SEI-9 (done). Aihe ja määrä: omistaja vastasi (Q45, Q46,
2026-10-27); aihevalinta ilman lapsen valintaa on oletus, ei kysytty.
Kriteerit:
1. Annettu uusi aihe "numerot". Kun lasken parit. Niin aiheessa on vähintään 10
   paria (vähimmäismäärä, esim. yksi–kymmenen, uno–diez; enemmän saa olla, Q45;
   aiempi oletus "ei yli 20" on poistettu), ja kullakin on es, fi ja aihe;
   kaikki 18 nykyistä paria ovat tallella ennallaan (ml. SEI-9:n kolme
   korjattua suomennosta); designerin ehdottama lopullinen parimäärä on
   kirjattu tehtävään.
2. Annettu kaikki parit (nykyiset ja uudet). Kun vertaan. Niin missään aiheessa
   ei ole kahta paria, joilla on sama suomi tai sama espanja (muuten yhdellä
   kysymyksellä olisi kaksi oikeaa vastausta).
3. Annettu kierros, jossa kysymyksenä on uuden aiheen pari. Kun pelaan 200
   siemenarvottua kierrosta kumpaankin suuntaan. Niin jokaisessa kysymyksessä
   on neljä eri vaihtoehtoa, joista tasan yksi on oikea, ja väärät ovat samasta
   aiheesta (numeroista); kierroksessa ei ole samaa paria kahdesti.
4. Annettu kysymys uudesta aiheesta. Kun katson vihjeriviä. Niin se kertoo
   aiheen suomeksi (sanamuoto designerilta, kuten "tervehdys" ja "väri" nyt).
5. Annettu jokainen uusi espanjankielinen sana. Kun painan "Kuuntele" Macilla
   Chromessa. Niin sana luetaan espanjaksi (es-ES) selvästi oikein; tarkistaja
   kirjaa jokaisen, joka kuulostaa väärältä (kuunteleminen ei ole sama kuin
   käännöksen tarkistus).
6. Annettu jokainen uusi pari. Kun tarkistaja käy ne läpi. Niin jokaisen parin
   suomi ja espanja tarkoittavat samaa ja espanja on espanjan A1-tasoa
   (konkreettinen, yleinen sana; enintään 2 sanaa; espanja Espanjasta, es-ES).
   Tarkistuksen tulos, sanakohtainen lähde (sanakirja) ja päivä kirjataan
   tehtävään ennen julkaisua. Tarkistaja on Claude (designer-rooli), ei
   omistaja (Q47, 2026-10-27); omistaja näkee sanataulukon design-katselmoinnissa,
   mutta ei ole sen tarkistaja.
7. Annettu kierros ja tulos 8/10 tai parempi. Kun kierros päättyy. Niin tähti
   ja tulosruutu toimivat kuten ennen (SEI-4 kriteerit 7 ja 8; tähti 8/10:llä,
   ei 7/10:llä).

### SEI-53 — Espanja: uusi aihe "eläimet"
Tila: review
Perustelu: omistaja pyysi lisää espanjan sanastoa; eläimet ovat K3:n (Q7)
toinen lisäaihe ja konkreettinen, kuvittuva sanasto.
Riippuvuus: SEI-4, SEI-9 (done). Voi julkaista erikseen SEI-52:sta. Aihe ja
määrä: omistaja vastasi (Q45, Q46, 2026-10-27); ilman artikkelia on oletus, ei
kysytty (E5).
Kriteerit:
1–7. Samat kuin SEI-52:n kriteerit 1–7, kun "numerot" korvataan aiheella
   "eläimet" (vähintään 10 paria, esim. gato–kissa, perro–koira; yksikkö,
   ilman artikkelia; enemmän saa olla, Q45), ja kriteeri 1:n "kaikki 18
   nykyistä" on "kaikki jo julkaistut parit".
8. Annettu uusi aihe "eläimet". Kun kysymyksessä on eläin. Niin oikea
   vastaus ja väärät vaihtoehdot ovat eläimiä (ei numeroita eikä värejä).

### SEI-54 — Espanja: uusi aihe "ruoka"
Tila: review
Perustelu: omistaja valitsi aiheen (Q46, 2026-10-27: "Saa olla myös ruoka ...
Noita kaikkia noilla on jo ollut", eli lapset ovat opiskelleet sen koulussa).
Riippuvuus: SEI-4, SEI-9 (done). Voi julkaista erikseen muista aiheista.
Kriteerit:
1–7. Samat kuin SEI-52:n kriteerit 1–7, kun "numerot" korvataan aiheella
   "ruoka" (vähintään 10 paria; enemmän saa olla, Q45; yksikkö, ilman
   artikkelia), ja kriteeri 1:n "kaikki 18 nykyistä" on "kaikki jo julkaistut
   parit".
8. Annettu uusi aihe "ruoka". Kun kysymyksessä on ruoka tai juoma. Niin oikea
   vastaus ja väärät vaihtoehdot ovat ruokia tai juomia (ei eläimiä, numeroita
   eikä värejä).
9. Annettu kaikki parit (nykyiset ja uudet, kaikki aiheet). Kun vertaan
   espanjankielisiä sanoja. Niin yksikään uuden aiheen espanjankielinen sana ei
   esiinny jo toisessa aiheessa. Tunnettu törmäys: "naranja" on jo aiheessa
   "väri" (oranssi); appelsiini (naranja) jätetään pois tai designer perustelee
   erikseen kirjaten sen tehtävään.

### SEI-55 — Espanja: uusi aihe "viikonpäivät"
Tila: review
Perustelu: omistaja valitsi aiheen (Q46, 2026-10-27; lapset ovat opiskelleet
sen koulussa).
Riippuvuus: SEI-4, SEI-9 (done). Voi julkaista erikseen muista aiheista.
Huomio: viikonpäiviä on täsmälleen 7, joten tämän aiheen vähimmäismäärä
poikkeaa SEI-52:n 10 parista: kaikki 7 viikonpäivää, ei enempää eikä vähemmän.
Seitsemän riittää neljälle vaihtoehdolle (vähintään 4 paria aiheessa).
Kriteerit:
1–7. Samat kuin SEI-52:n kriteerit 1–7, kun "numerot" korvataan aiheella
   "viikonpäivät", kriteeri 1:n "vähintään 10 paria" on "täsmälleen 7 paria"
   ja "kaikki 18 nykyistä" on "kaikki jo julkaistut parit".
8. Annettu uusi aihe "viikonpäivät". Kun lasken parit. Niin siinä ovat kaikki
   seitsemän päivää maanantaista sunnuntaihin (lunes, martes, miércoles,
   jueves, viernes, sábado, domingo), kukin kerran, suomennoksena
   maanantai … sunnuntai.
9. Annettu kysymys viikonpäivästä. Kun katson vaihtoehtoja. Niin oikea vastaus
   ja kolme väärää ovat viikonpäiviä (ei muiden aiheiden sanoja).
10. Annettu jokainen espanjankielinen viikonpäivä. Kun tarkistaja käy ne läpi.
   Niin kirjoitusasu (pieni alkukirjain, aksentti: miércoles, sábado) on
   tarkistettu ja kirjattu sanakohtaisesti kriteerin 6 tapaan.

### SEI-56 — Espanja: uusi aihe "perhe"
Tila: review
Perustelu: omistaja valitsi aiheen (Q46, 2026-10-27: "sekä perhe"; lapset ovat
opiskelleet sen koulussa).
Riippuvuus: SEI-4, SEI-9 (done). Voi julkaista erikseen muista aiheista.
Kriteerit:
1–7. Samat kuin SEI-52:n kriteerit 1–7, kun "numerot" korvataan aiheella
   "perhe" (vähintään 10 paria; enemmän saa olla, Q45; yksikkö, ilman
   artikkelia), ja kriteeri 1:n "kaikki 18 nykyistä" on "kaikki jo julkaistut
   parit".
8. Annettu uusi aihe "perhe". Kun kysymyksessä on perheenjäsen. Niin oikea
   vastaus ja väärät vaihtoehdot ovat perheenjäseniä (ei muiden aiheiden
   sanoja).
9. Annettu jokainen uusi pari. Kun luen suomennoksen. Niin suomi on se, mitä
   lapsi käyttäisi (esim. madre = äiti, ei "vanhempi"), ja sukupuolittuneet
   parit (esim. hermano / hermana) ovat omat parinsa tai jätetty pois;
   designer valitsee ja kirjaa, kumpi, jotta kriteeri 2 (ei kahta samaa suomea)
   pitää.

Kysymykset E1–E5 (omistajan sanat sellaisinaan; vastaukset myös
`docs/questions.md`):
- E1 (päätös) — VASTATTU 2026-10-27 (Q45), sanatarkasti: "saa olla
  enemmänkin". Oletus oli: Sanoihin vähintään 20 uutta sanaa kumpaankin listaan
  (Normaali 24 → 44+, Harry Potter 20 → 40+); Espanjaan 10 uutta paria per
  aihe. Tulkinta (pm, OLETUS, ei omistajan sanoja): oletusmäärät ovat
  vähimmäismääriä ja enemmän on tervetullutta; designer ehdottaa lopullisen
  määrän aiheittain ja listoittain, ja se kirjataan tehtävään. Kriteerien
  vähimmäisrajat (44, 40, 10 paria; viikonpäivät 7) eivät muutu. Ylärajaa ei ole
  annettu; aiempi oletus "ei yli 20 paria per aihe" on poistettu. Jos omistaja
  tarkoitti jotain muuta (esim. selvästi enemmän, kuten 50+ per lista), se on
  uusi kysymys vasta, kun designerin ehdotus on nähty.
- E2 (päätös) — VASTATTU 2026-10-27 (Q46), sanatarkasti: "numerot ja eläimet on
  hyvät. Saa olla myös ruoka ja viikonpäivät sekä perhe. Noita kaikkia noilla on
  jo ollut" (= lapset ovat opiskelleet nämä koulussa). Aiheet: numerot SEI-52,
  eläimet SEI-53, ruoka SEI-54, viikonpäivät SEI-55, perhe SEI-56. Keho ja
  fraasit jäävät SEI-40:een (ei pyydetty nyt). Aiheen valintaa lapselle ei
  kysytty eikä pyydetty: oletus säilyy (kierrokset sekoittavat kaikki aiheet
  kuten nyt, aihe näkyy vihjerivillä; oletus, ei kysytty). Aiheen valinta
  olisi oma tehtävänsä ja vaatisi designerin (EHDOTUS, ei tässä: "Espanja:
  pelaaja valitsee aiheen"). Huomio: seitsemän aihetta ja entistä enemmän
  pareja tekee vanhojen aiheiden (tervehdys, väri) osuudesta kierroksessa
  pienemmän; ks. riskit.
- E3 (tieto) — VASTATTU 2026-10-27 (Q47), sanatarkasti: "sinä". Tulkinta:
  tarkistaja on Claude (designer-rooli), joka tarkistaa espanjan ja suomennokset
  sanakirjasta ja kirjaa lähteen sanakohtaisesti; sama koskee Sanojen suomea
  (SEI-50, SEI-51). Omistaja ei pyytänyt olla tarkistaja; hän näkee
  sanataulukot design-katselmoinnissa (ennen arkkitehtia), ja ne näytetään
  hänelle siellä. Rajoitus (pm, huomio): tarkistaja ei ole espanjaa äidinkielenään
  puhuva eikä kuule ääntämistä; kriteerit 5 (ääni) jäävät kuuntelutarkistukseksi
  (ei sama kuin käännös). Kriteerin kirjaus: SEI-50 kr 8, SEI-51 kr 8, SEI-52
  kr 6 ja niihin viittaavat.
- E4 (päätös, pienempi) — EI KYSYTTY, oletus voimassa. Saako Harry Potter
  -sanaksi henkilöiden nimiä (esim. hahmoja)? Oletus: ei, vain esineitä,
  paikkoja, otuksia ja käsitteitä. Ja saako Normaali-listaan lisätä pidempiä
  sanoja kuin 7 kirjainta? Oletus: ei (1.–2. luokan lukutaito).
- E5 (päätös, pienempi) — EI KYSYTTY, oletus voimassa. Espanjan substantiivit
  artikkelin kanssa (el gato) vai ilman (gato)? Oletus: ilman, kuten nykyiset
  ("rojo").

Riskit ja huomiot:
- Sisällön oikeellisuus: ei koodilla todennettavissa; tarkistus on
  tarkistustyötä (SEI-50 kr. 8, SEI-51 kr. 8, SEI-52 kr. 6). Tarkistaja on
  Claude (designer-rooli), lähde kirjataan sanakohtaisesti (Q47). Riski:
  sanakirjalähde ei korvaa espanjaa äidinkielenään puhuvaa; omistajalla on
  katselmoinnissa mahdollisuus huomauttaa, mutta häntä ei ole nimetty
  tarkistajaksi.
- Espanjan aiheiden määrä kasvaa kahdesta seitsemään (SEI-52 – SEI-56). Jos
  aiheita julkaistaan yksi kerrallaan, kunkin julkaisun jälkeen aiempi
  aihe-osuus kierroksessa pienenee (ks. "Sanojen määrä kasvaa" alla).
- SEI-54 (ruoka): "naranja" on jo aiheessa "väri" (oranssi); kriteeri 9 vaatii,
  ettei sama espanja ole kahdessa aiheessa.
- Suomen tavutus: sovelluksen tavutus on sääntöpohjainen; yhdyssanat ja
  harvinaiset yhdistelmät voivat tavuttua väärin (ei tarkistettu uusilla
  sanoilla). Kriteerit 6/7 tarkistavat sanan kerrallaan.
- Emojit: uudet emojit voivat puuttua vanhalta iPadilta (kts. Riskit,
  "Emojikuvat"); ei tarkistettu.
- Espanjan puhe: es-ES-ääni (Mónica) lausuu numerot ja eläinten nimet ehkä
  eri tavalla kuin Latinalaisen Amerikan espanjassa; sanasto valitaan
  Espanjan espanjasta. Ei kuunneltu.
- Sanojen määrä kasvaa, ja Espanjassa kierros arvotaan kaikista pareista:
  vanhat aiheet (tervehdys, väri) esiintyvät harvemmin yksittäisessä
  kierroksessa. Voi olla toivottu tai ei; omistajan tietoon.
- Ehdotus, ei pyyntö (pm): lisäyksen jälkeen sisältö voisi tulla omistajan
  käyttöön helposti muokattavaksi taulukoksi, mutta sitä ei pyydetty.

---

## Historia

- 2026-10-22: backlog luotu (SEI-1 – SEI-44). Kaikki tehtävät todo.
- 2026-10-23: SEI-1:n ulkoasu (`docs/design/sei-1.md`, `.html`) hyväksytty
  omistajalla (Q8). Nimet lyhyet: Matikka, Sanat, Espanja (Q9). Kesken
  jäänyt kierros jatkuu, ei varmistuskysymystä (Q10).
- 2026-10-23: SEI-1:n suunnitelma `docs/plans/sei-1.md` valmis, odottaa
  omistajan hyväksyntää (Q12). Pääsessio hyväksyi suunnitelman O1:n:
  kriteerit 4–5 osoitetaan SEI-1:ssä kehyksen ja testipelin tasolla, ja
  SEI-2 – SEI-4 ajavat samat testit oikealla pelillä. Node v26.11.0
  tarkistettu Macilla 2026-10-23 (O2).
- 2026-10-23: omistaja hyväksyi SEI-1:n suunnitelman (Q12) ja valitsi
  julkaisupaikaksi GitHub-verkkosivun (Q11, vaihtoehto A). SEI-1 →
  in-progress, developer käynnistetty.
- 2026-10-23: SEI-1 toteutettu (commitit deefcbe, 299f3dc, 1ff2bc3,
  a560d58). Developerin raportti: `npm run test:unit` 21/21,
  `npx playwright test` 198 läpi, 2 ohitettu tarkoituksella, 0 hylätty.
  Laitetarkistus (suunnitelma §7 A ja B) ja julkaisu (vaihe 9) tekemättä.
  SEI-1 → review.
- 2026-10-23: reviewer APPROVED SEI-1 (commitit deefcbe..a560d58).
  Reviewerin oma ajo: unit 21/21, playwright 198 läpi / 2 ohitettu / 0
  hylätty (node v26.11.0, @playwright/test 1.64.1). Should fix: 1) kriteerin
  6 eletesti ei havaitse `await`-viivettä eikä WebKitissä `import()`:ia
  (helpers.mjs:25-26,70) → arkkitehdille; 2) serve.mjs kaatuu URL:iin jossa
  %00 → korjataan ennen iPad-tarkistusta. SEI-1 → verifying; sulkeutuu
  suunnitelman §7 A ja B laitetarkistuksella.
- 2026-10-23: SEI-1:n eletestin korjaus (TD-1, TD-5), commitit 9b275e3 ja
  ab0d01d, reviewer APPROVED toisella kierroksella. Reviewerin ajo: unit
  21/21, playwright 194 läpi / 2 ohitettu / 0 hylätty; mutaatio
  `await Promise.resolve()` openFromCardissa 12/24 hylätty ja Kuuntelen
  onTapissa 4/24 hylätty, kaikilla 4 projektilla. Palvelinkorjaus 1724d30
  (URL jossa %00 → 400, palvelin pysyy pystyssä; tarkistettu curlilla
  2026-10-23). SEI-1 pysyy verifying-tilassa iPad-tarkistukseen asti.
- 2026-10-23: omistajalla ei iPadia käsillä; LAN-tarkistus (Q13) peruttu.
  Omistaja kielsi julkisen GitHub-repon (Q14: "ei julkiseksi"), joten
  Q11:n vaihtoehto A ei käy sellaisenaan. Julkaisupaikka palautettu
  arkkitehdille.
- 2026-10-23: omistaja tarkensi Q14: julkinen GitHub käy, kun iät
  poistetaan ja käyttäjät kuvataan vain "1.–2.-luokkalaisille". Iät ja
  lapsikohtaiset lukutaitotiedot poistettu dokumenteista; README lisätty.
  Julkaisu tuoreena historiana (suunnitelma §9, tarkennus 2026-10-23).
- 2026-10-23: julkaistu. Repo https://github.com/hakaotu/seikkailut
  (julkinen, yksi commit dabd721; vanha historia vain paikallisessa
  haarassa local-history). Pages: https://hakaotu.github.io/seikkailut/,
  deploy-ajo 39918840857 onnistui. Pääsessio tarkisti 2026-10-23
  WebKitillä 820×1130 kosketuksella: kolme korttia, Matikka aukeaa
  osoitteeseen #/matikka, Etusivu palaa, ei sivuvirheitä. Ääntä ei
  kuultu. SEI-1 odottaa iPad-tarkistusta (Q15).
- 2026-10-23: SEI-1 → done omistajan Mac-havainnon perusteella (Q15).
  iPad-tarkistus siirtyy SEI-2:n yhteyteen.
- 2026-10-23: lisätty SEI-45 (luonnollisempi puheääni), omistajan havainto
  Macilla julkaistusta sovelluksesta. Reitti A/B auki, odottaa omistajan
  päätöstä. Tila todo.
- 2026-10-23: Q16 → reitti A (laitteen paras oma ääni). SEI-45 →
  in-progress; ilman designeria ja arkkitehtia, koska muutos rajautuu
  äänen valintaan `speech.js`:ssä.
- 2026-10-23: SEI-45 toteutettu (f264f5f; developer: unit 27/27, playwright 194/2 ohitettu/0). → review.
- 2026-10-23: SEI-45 reviewer APPROVED (f264f5f; reviewer: unit 27/27,
  playwright 194/2/0). Should fix 1–4 (Enhanced-bonus vain hyville
  äänille, voiceURI-tunnistus, kaksi testiä) jatkokorjauksena. Julkaistu.
  → verifying: omistaja kuuntelee Macilla.
- 2026-10-23: SEI-45 should fix 1–4 korjattu (701b44e; unit 30/30 pääsession ajossa, playwright 194/2/0 developerin ajossa, mutaatiot tarkistettu). Julkaistu.
- 2026-10-23: SEI-45 havainto (Q17): omistajan mukaan ei parempi; "kissa"
  kuulostaa englantia puhuvan suomelta. Pääsessio tarkisti samana päivänä
  Chromella (Playwright, channel chrome, tämä Mac) julkaistusta sivusta:
  Sanat lausuu "kissa" fi-FI äänellä Satu (rate 0,78 ja 0,52), Espanja
  "hola" es-ES äänellä Mónica. Selaimen fi-äänet: Satu + Eloquence-sarja.
  Omistajan selainta ja kuultua ääntä ei tiedetä (Q18). Tila pysyy
  verifying.
- 2026-10-23: SEI-45 kriteerin 8 suunnitelma `docs/plans/sei-45.md` valmis (tauko ajastimella ensimmäisen lukukerran jälkeen, 700 ms). Odottaa omistajan hyväksyntää, kun Q19–Q21 on vastattu.
- 2026-10-23: Q19: Satun parannettu ääni ladattu omistajan Maciin, ääni kelpaa. Omistaja pyysi taukoa toistojen väliin ("joku tauko siihen väliin nyt"); pääsessio käsittelee tämän suunnitelman `docs/plans/sei-45.md` hyväksyntänä. Kriteerin 8 toteutus → developer.
- 2026-10-23: havainto (omistaja, Mac Chrome, Espanja-kortti): "toi Hola kuulostaa vielä ihan puurolta äänenä". Pääsession tarkistus samana päivänä: Espanja käyttää ääntä Mónica (es-ES, perusversio). Q22: Mónican parannettu ääni.
- 2026-10-23: SEI-45 kriteeri 8 toteutettu (e1e24c8; developer: unit 40/40, playwright 194/2/0). Pääsession §7 A -mittaus samana päivänä: oikea Chrome (Playwright channel chrome, ei headless) tällä Macilla, paikallinen palvelin commitista e1e24c8, Sanat-napautus: ääni Satu (Enhanced), napautuksesta 1. alkuun 50 ms, 1. loppu → 2. alku 708 ms. → review.
- 2026-10-23: SEI-45 kriteeri 8 reviewer APPROVED (e1e24c8; reviewer: unit 40/40, playwright 194/2/0; mutaatiot M2, M3 havaittu, M1 ei). Should fix 1–2 ja nice 3 jatkokorjauksena. Julkaistu; omistajan kuuntelu Q22:ssa.
- 2026-10-23: SEI-45 jatkokorjaus 96d8cc0 (reviewerin should fix 1–2, nice 3). Pääsession ajo: unit 43/43, playwright 194/2/0; mutaatio M1 kaatuu nyt 2 testiin. Julkaistu.
- 2026-10-23: SEI-45 → done (Q22). Q21: tasonimet Helppo/Keskitaso/Vaikea (oletus).
- 2026-10-23: Matikan ulkoasu `docs/design/sei-2.md`, `.html` (SEI-2, SEI-5, SEI-6) hyväksytty omistajalla (Q20). Tasonimet Helppo/Keskitaso/Vaikea (Q21). → arkkitehti.
- 2026-10-23: Matikan suunnitelma `docs/plans/sei-2.md` valmis, odottaa omistajan hyväksyntää (Q23). Pääsessio hyväksyi O1:n (Enter numeronäppäimellä = OK) ja O3:n (suljetaan Mac-tarkistuksilla A ja B, iPad C myöhemmin).
- 2026-10-23: Q23 hyväksytty. SEI-2, SEI-5, SEI-6 → in-progress, developer käynnistetty.
- 2026-10-23: SEI-2/5/6 toteutettu (5cc4043..bc62141; developer: unit 61/61, playwright 351/9 ohitettu/0). → review.
- 2026-10-23: SEI-2/5/6 reviewer APPROVED (bc62141; reviewer: unit 61/61, playwright 351/9/0). Should fix S1–S3 jatkokorjauksena. Julkaistu. → verifying (suunnitelma §7 A ja B).
- 2026-10-23: SEI-2/5/6 §7 A (pääsessio): https://hakaotu.github.io/seikkailut/
  commitilla 253c20f, oikea Chrome (Playwright channel chrome, 1280×720,
  ei headless) tällä Macilla. Matikka-kortti → valintaruutu, Helppo
  valittuna, ei puhetta ennen Aloitaa. Aloita → Lasku 1/10, puhuttu
  "0 plus 5" äänellä Satu (Enhanced). Kierros 2 oikein → "2 / 10 oikein,
  Harjoittelemalla oppii!", ei mestaria; Pelaa uudelleen, 10 oikein →
  "10 / 10 oikein, Olet matikkamestari!" ja konfetti. Kaikki puhe Satu
  (Enhanced). B (omistajan kuuntelu) Q24:ssä.
- 2026-10-23: Matikan jatkokorjaus S1–S3 (c00873a, 9814d40, 33d4c25; kapealla ruudulla väärä kirjoitettu vastaus rivittyy laatikon alle). Pääsession ajo: unit 61/61, playwright 371/9/0. Julkaistu.
- 2026-10-23: SEI-2, SEI-5, SEI-6 → done (Q24). Seuraavaksi SEI-3, SEI-7, SEI-8 (Sana) designerille.
- 2026-10-23: lisätty SEI-46 (Matikka: automaattinen siirtyminen oikean vastauksen jälkeen), omistajan havainto Macilla julkaistusta Matikasta. Neljä avointa kysymystä oletuksineen (väärä vastaus, kesto 4 s, ohitus Seuraavalla, 10. vastaus). Tila todo.
- 2026-10-23: SEI-46 avoimet kysymykset 1–4 ratkaistu oletusten mukaan (Q25: "ok"). Odottaa designeria Sanat-luonnoksen katselmoinnin jälkeen.
- 2026-10-26: Q26: Sanojen ulkoasu `docs/design/sei-3.md` hyväksytty omistajalla ("ok ja jatka"); koskee SEI-3, SEI-7, SEI-8. Q27: ohitettu sana näytetään ja luetaan ensin, sitten Seuraava ("joo", tulkittu oletukseksi; SEI-7, design E5). Q28: omistaja vastasi "joo" kysymykseen, siirtyykö Sanat oikean sanan jälkeen itsestään kuten Matikka, samoin säännöin kuin Q25 → lisätty SEI-47 (tila todo). SEI-46:een kirjattu, että Matikan ja Sanojen automaattisen siirtymisen ulkoasu suunnitellaan yhdessä. Tilarivejä ei muutettu.
- 2026-10-26: Q31: Espanjan ulkoasu `docs/design/sei-4.md` (+ `.html`) hyväksytty omistajalla ("ok"); kattaa SEI-4, SEI-9, SEI-10, ja sen mukaan Espanja siirtyy oikean vastauksen jälkeen itsestään samoin säännöin kuin Matikka ja Sanat (Q25, Q28; `docs/design/sei-46.md`, Q29) → lisätty SEI-48 (tila todo). Q32: suomennokset adiós = näkemiin, buenas tardes = hyvää iltapäivää, por favor = ole kiltti hyväksytty omistajalla tarkistajana (SEI-9; kriteeri 4 lisätty). Q33: vanhan Espanjan tähtiä ei siirretä, alkavat nollasta (SEI-4; kriteeri 11 lisätty). Tilarivejä ei muutettu.
- 2026-10-26: lisätty SEI-49 (Sanat: loppuruudun Kuuntele puhuu "Heti oikein 9. Uudella yrityksellä 1." eikä suomea), omistajan havainto klo 14.45 Macilla julkaistusta Sanat-pelistä (Harry Potter, Keskitaso, 9 / 10). Tila todo; muiden tehtävien tiloja ei muutettu.
- 2026-10-27: omistajan pyyntö lisätä sisältöä Sanoihin (Normaali + Harry Potter) ja Espanjaan (A1, 1.–2. luokka) → osio E: SEI-50 (Normaali), SEI-51 (Harry Potter), SEI-52 (Espanja: numerot), SEI-53 (Espanja: eläimet); kaikki todo. SEI-40 absorboi kaksi ensimmäistä aihetta (huomio lisätty), SEI-34 pysyy erillisenä (huomio lisätty). Avoimet kysymykset E1–E5 oletuksineen osiossa E. Muiden tehtävien tiloja ei muutettu.
- 2026-10-27: omistajan vastaukset Q45 (määrä: "saa olla enemmänkin"), Q46 (aiheet: numerot, eläimet, ruoka, viikonpäivät, perhe; lapset ovat opiskelleet ne koulussa) ja Q47 (tarkistaja: "sinä" = Claude, designer-rooli, sanakirjalähde sanakohtaisesti) kirjattu osioon E. Lisätty SEI-54 (ruoka), SEI-55 (viikonpäivät, täsmälleen 7 paria), SEI-56 (perhe); kaikki todo. SEI-40:n huomio päivitetty (jäljellä keho ja fraasit). SEI-50 – SEI-53:n kriteerit päivitetty: määrät ovat vähimmäismääriä (E1-tulkinta on pm:n oletus), tarkistajaksi Claude (kr 8 / kr 6), E4 ja E5 merkitty "oletus, ei kysytty". Olemassa olevien tehtävien tiloja ei muutettu.
