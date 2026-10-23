# Backlog: Seikkailut

Päivitetty 2026-10-22 (pm). Syöte: `docs/brief.md` ja kolme kopiota
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

## B. Nykyisen toiminnan säilyttäminen (jokainen nykyinen käyttötapaus)

### SEI-2 — Matikka: kaikki nykyiset toiminnot uudessa sovelluksessa
Tila: todo
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
Tila: todo
Perustelu: omistaja vaati kaikki use caset; tämä on Sanaseikkailun koko
nykyinen käyttö.
Riippuvuus: SEI-1.
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
Tila: todo
Perustelu: omistaja vaati kaikki use caset; tämä on Espanjavalmentajan
koko nykyinen käyttö.
Riippuvuus: SEI-1.
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

## C. Nykyisten toimintojen laatu (lähtötaso koodista luettu, ei havaintoja)

Nämä perustuvat kooditasoiseen lukemiseen. Kukaan ei ole kokenut niitä
vioiksi. Ne liittyvät omistajan toiveeseen "UX paljon parempi"; ne ovat
mukana ensimmäisessä versiossa vain jos K1 niin ratkaisee. Vakavuutta ei
anneta.

### SEI-5 — Matikka: virhepalaute ja tapahtuma vastaavat toisiaan
Tila: todo
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
Tila: todo
Perustelu: lähtötaso: Matikan loppuruutu sanoo "Olet matikkamestari!"
riippumatta tuloksesta.
Riippuvuus: SEI-2.
Kriteerit:
1. Annettu kierros päättyy tulokseen 2/10. Kun loppuruutu näkyy. Niin
   teksti ja ääni eivät väitä lasta mestariksi, vaan vastaavat tulosta.
2. Annettu kierros päättyy tulokseen 10/10. Kun loppuruutu näkyy. Niin
   loppuruutu eroaa visuaalisesti ja tekstiltään tuloksesta 2/10.

### SEI-7 — Sana: virheen jälkeen koko sanaa ei tyhjennetä, askelpalautin kaikilla tasoilla, ohitus
Tila: todo
Perustelu: lähtötaso: väärä yritys tyhjentää koko sanan, "Aloita alusta"
on ainoa korjaus ja Vaikealla tasolla ei ole askelpalautinta; sanaa ei voi
ohittaa.
Riippuvuus: SEI-3. Designer päättää tarkan tavan.
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
Tila: todo
Perustelu: lähtötaso: pisteet lasketaan vain oikeista, joten tulos on
aina 10/10 eikä edistymisestä saa tietoa.
Riippuvuus: SEI-3, SEI-7.
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
Tila: todo
Perustelu: lähtötaso: käännösvirheitä (por favor / "ole hyvä", buenas
tardes / "hyvää iltaa"); lapset oppisivat väärän sanan.
Riippuvuus: SEI-4. Tarvitsee espanjaa osaavan tarkistajan (ks. K3).
Kriteerit:
1. Annettu 18 nykyistä sanaparia. Kun tarkistaja käy ne läpi. Niin jokaisen
   parin suomi ja espanja tarkoittavat samaa (tarkistajan hyväksyntä
   kirjataan tehtävään).
2. Annettu pari "buenas tardes" (nykyisin suomeksi "hyvää iltaa", rivi
   198). Kun kysymys näytetään. Niin suomenkielinen vastine on
   tarkistajan hyväksymä.
3. Annettu pari "por favor" (nykyisin suomeksi "ole hyvä", rivi 201). Kun
   kysymys näytetään. Niin suomenkielinen vastine on tarkistajan hyväksymä.

### SEI-10 — Espanja: palaute väärästä ja "Seuraava" ilman vastausta
Tila: todo
Perustelu: lähtötaso: väärästä vastauksesta kerrotaan vain värillä (punainen
/ vihreä) ilman tekstiä tai ääntä, ja "Seuraava" siirtää eteenpäin
vastaamatta. Huom: brief sanoo "ei palautetta väärästä"; koodin
mukaan värit on, tekstiä ei.
Riippuvuus: SEI-4. Designer päättää tavan.
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
