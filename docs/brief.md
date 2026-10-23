# Seikkailut: lähtötilanne ja omistajan linjaukset

Kirjoitettu 2026-10-22 pääsessiossa. Tämä on pm:n syöte: kolme nykyistä
lastenpeliä yhdistetään yhdeksi paremmaksi sovellukseksi.

## Omistajan pyyntö (sanatarkasti)

> Lue matikkaseikkailu, sanaseikkailu ja espanjavalmentaja. Näistä haluan
> tehdä monta pykälää paremmat versiot. Jokaisen use casen varmasti saat
> kiinni. Tehdään niistä monipuolisemmat ja UX:ltään paljon paremmat.

## Omistajan vastaukset (2026-10-22)

- **Pelaajat:** tarkoitettu 1.–2.-luokkalaisille. Pelaajat osaavat
  lukea, osa vasta vähän aikaa. Espanjaa opiskellaan 1. luokalta.
- **Laite:** tietokone tai iPad, selaimessa.
- **Rakenne:** yksi yhteinen sovellus, ei kolmea erillistä.

## Nykyiset versiot

Kopiot hakemistossa `originals/`. Lähteet:

| Peli | Lähde | Julkaisu nyt |
|---|---|---|
| Matikkaseikkailu | github.com/hakaotu/matikkaseikkailu, commit 53f88c3 (2026-03-09) | ei julkaistu |
| Sanaseikkailu | github.com/hakaotu/sanaseikkailu, commit 34cc5d0 (2026-02-19) | Google Apps Script -web app, GitHub Actions deployaa mainista |
| Espanjavalmentaja | vain paikallisesti, `Claude-projects/Espanjavalmentaja/index.html` (2025-09-28) | ei julkaistu |

## Koodista luettua (ei havaintoja käytöstä)

Nämä on luettu koodista, kukaan ei ole raportoinut niitä. Ne kuvaavat
lähtötasoa, eivät ole bugiraportteja.

- Matikka: väärän vastauksen jälkeen teksti kehottaa yrittämään uudelleen,
  mutta napit lukittuvat ja peli jatkaa. Loppuruutu sanoo "matikkamestari"
  tuloksesta riippumatta. Ei edistymisen tallennusta.
- Sana: väärä yritys tyhjentää koko sanan, ohitusta ei ole. Pisteet
  lasketaan vain oikeista, joten tulos on aina 100 %. Vaikealla tasolla
  ei askelpalautinta. 24 + 20 sanaa.
- Espanja: käännösvirheitä (por favor ≠ "ole hyvä", buenas tardes =
  "hyvää iltapäivää"). Ei palautetta väärästä. "Seuraava" ohittaa
  vastaamatta. 18 sanaa, 2 aihetta.

## Pääsession ehdotukset omistajalle (2026-10-22)

Ehdotuksia, ei hyväksyttyjä vaatimuksia. Omistaja on päättänyt vain
rakenteen (yksi sovellus).

- Yhteinen pohja: profiilit, yhteinen ilme ja palkinnot, virheiden
  kertaus (myös seuraavina päivinä), mukautuva vaikeustaso, päivän
  tavoite ja tarrakokoelma, vanhemman näkymä, toimii iPadilla
  kotinäytöltä ja ilman verkkoa.
- Matikka: kuvalaskut, puuttuva luku, kymppiparit, vertailu, lukusuora,
  kertotaulujen valinta, jakolasku, rahalaskut, sanalliset tehtävät,
  vapaaehtoinen aikahaaste.
- Sana: tavupalat, lue ja valitse kuva, lauseiden rakentaminen,
  kirjainkohtainen virhepalaute, askelpalautin ja ohitus, vanhemman omat
  sanalistat, lisää teemoja, isot/pienet kirjaimet.
- Espanja: käännösvirheiden korjaus, lisää aiheita (numerot, eläimet,
  perhe, ruoka, keho, viikonpäivät, fraasit), kuuntele ja valitse kuva,
  muistipeli, oikeinkirjoitus aksentteineen, puheentunnistus.

Ikä- ja lukutaitotieto muuttaa painotusta: esilukijan tiloja ei tarvita,
kuvalaskut ovat korkeintaan apuväline, ja lukemisen sujuvuus (tavut,
lauseet) on Sanaseikkailun ydin. Kaksi eri tasoista lasta = profiilit
ovat välttämättömiä.
