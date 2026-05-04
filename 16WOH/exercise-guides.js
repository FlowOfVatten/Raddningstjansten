(function () {
  const gym = {
    "latsdrag brett grepp": `Startposition: Sitt ned, lås låren under dynan. Greppa stången bredare än axlar. Bröstet upp, lätt bakåtlutning (10-20°).
Utförande:
1. Dra ner stången mot övre bröstet/nyckelben genom att föra armbågarna ner och bak.
2. Pausa 0,5-1 s när stången är nära bröstet.
3. Släpp upp kontrollerat tills armarna är raka och skulderbladen glider upp igen.
Viktiga cues: Bröst upp. Armbågar i fickorna. Dra med ryggen - inte biceps först.
Vanliga fel: Gungar/rycker, drar bakom nacken, släpper upp för snabbt, krymper axlar mot öron.
Rek/tempo: 8-12 reps. Tempo 2 s ner / 3 s upp.`,

    "sittande kabelrodd smalt grepp": `Startposition: Sitt upprätt, neutralt ryggläge, fötter stadigt. Sträck armarna fram och låt skulderblad följa med.
Utförande:
1. Starta draget med att dra skulderbladen bak och ner.
2. Dra handtaget mot nedre magen (ungefär navelhöjd).
3. Pausa 1 s, släpp tillbaka tills armarna är raka igen.
Cues: Skulderblad först, armar sen. Armbågar nära kroppen.
Vanliga fel: Rundar ryggen, drar mot bröstet, slår i magen, lutar sig bak/fram.
Rek/tempo: 8-12 reps. 2 s drag / 3 s retur.`,

    "rack pull knähöjd": `Startposition: Stång på pins i knähöjd. Stå höftbrett, greppa strax utanför benen. Spänn bål, bröst upp, neutral rygg.
Utförande:
1. Skruva fast kroppen: spänn lats (tänk att du trycker armhålorna mot sidan).
2. Lyft stången genom att sträcka höften och stå upp.
3. Stanna kort i toppläget, sänk kontrollerat till pins igen.
Cues: Tryck golvet bort. Höften fram. Stången nära benen.
Vanliga fel: Rycker från pins, översträcker ländrygg i toppen, tappar bålspänning.
Rek/tempo: 4-8 reps. 1-2 s upp / 2-3 s ner.`,

    "unilateral hantelrodd": `Startposition: Ena knät + handen på bänk, andra foten i golvet. Neutral rygg. Hantel hänger rakt ner.
Utförande:
1. Dra hanteln mot höften (inte rakt upp mot axeln).
2. Armbågen går bakåt nära kroppen.
3. Pausa 1 s, sänk långsamt till fullt sträck.
Cues: Dra armbågen bak. Skulderblad in mot ryggraden.
Vanliga fel: Vrider kroppen, rycker med ryggen, drar mot bröstet, kortar rörelsen.
Rek/tempo: 8-12/arm. 2 s upp / 3 s ner.`,

    "stående vadpress maskin": `Startposition: Axlar under dynor, fötter på plattan med hälar fria.
Utförande:
1. Pressa upp på tå till max.
2. Pausa 1 s på toppen.
3. Sänk ner tills hälarna kommer tydligt under plattan (stretch).
Cues: Fullt upp, fullt ner. Kontroll - ingen studs.
Vanliga fel: Studsar, små rörelser, knän låsta hårt bakåt.
Rek/tempo: 10-20 reps. 2 s upp / 3 s ner.`,

    "sittande vadpress": `Startposition: Knädyna över låren, fötter på platta, hälar fria.
Utförande: Samma princip - upp, paus, ner i stretch.
Cues: Tryck genom stortån. Håll knäna still.
Vanliga fel: Studs och halva reps.
Rek/tempo: 12-20 reps. Tempo 2 s upp / 3 s ner.`,

    "lutande bänkpress hantel eller skivstång": `Startposition: Bänk 30-45°. Skulderblad bak/ner, bröst upp. Fötter stabilt.
Utförande:
1. Sänk vikten mot övre bröstet med kontroll.
2. Underarmar ungefär lodrätt i botten.
3. Pressa upp i samma bana utan att tappa skulderbladens position.
Cues: Knip skulderblad. Pressa upp - inte fram.
Vanliga fel: Armbågar för långt ut, tappar skulderblad, studsar på bröstet.
Rek/tempo: 6-10 reps. 2 s ner / 1 s upp kontrollerat.`,

    "flat maskinpress eller skivstångsbänkpress": `Startposition: Skulderblad ihop, lätt svank, fötter i golv.
Utförande: Sänk till bröst och pressa upp. Maskin: samma princip, styr med bröst/armar utan att axlar åker upp.
Cues: Bröst upp. Armbågar ca 45° från kroppen.
Vanliga fel: Axlar fram, studs, kort ROM.
Rek/tempo: 6-12 reps. 2-3 s ner / 1-2 s upp.`,

    "pec dec eller kabelfly": `Startposition: Lätt böjda armbågar. Bröst upp, skulderblad lätt bak/ner.
Utförande:
1. För armarna i en stor båge in framför bröstet.
2. Pausa när händerna möts (eller nästan möts).
3. Öppna tillbaka långsamt tills bröstet sträcks utan att axlar ramlar fram.
Cues: Kramar en stor boll. Håll armbågsvinkeln.
Vanliga fel: Sträcker armbågar (blir press), för tungt så axlar tar över.
Rek/tempo: 10-15 reps. 2 s in / 3 s ut.`,

    "hammarcurl": `Startposition: Stå rakt, hantlar vid sidan, neutralt grepp.
Utförande: Curl upp utan att svaja. Sänk kontrollerat till full sträck.
Cues: Armbågar klistrade. Handled neutral.
Vanliga fel: Svingar, lyfter armbågar fram.
Rek/tempo: 8-12 reps. 2 s upp / 3 s ner.`,

    "ez-stångscurl": `Startposition: Greppa EZ-stång. Stå stabilt.
Utförande: Curl till nära axelhöjd och sänk långsamt.
Cues: Armbågar stilla. Full sträck i botten.
Vanliga fel: Lutar bak, halva reps.
Rek/tempo: 8-12 reps. 2 s upp / 3 s ner.`,

    "koncentrationscurl": `Startposition: Sitt, armbåge mot insida lår.
Utförande: Curl upp långsamt, hård spänn i toppläget, sänk långsamt.
Cues: Ingen axelrörelse.
Vanliga fel: Tappar stöd, studsar.
Rek/tempo: 10-15/arm, 2 s upp / 3 s ner.`,

    "benpress": `Startposition: Sätt fötterna axelbrett. Knän följer tår. Ländrygg i kontakt med ryggstöd.
Utförande:
1. Sänk tills knäna är runt 90° (eller djupare om du håller bäckenet neutralt).
2. Pressa upp genom hälarna utan att låsa knän hårt.
Cues: Knän över tår. Tryck genom hela foten.
Vanliga fel: Knän faller in, rumpan lyfter (butt wink), för grunt.
Rek/tempo: 8-15 reps. 2-3 s ner / 1-2 s upp.`,

    "hackknäböj eller skivstångsknäböj": `Startposition hack: Rygg mot platta, fötter lite fram.
Startposition skivstång: Stång på övre rygg, fötter axelbrett.
Utförande:
1. Sänk kontrollerat genom knä + höft.
2. Gå till parallellt eller djupare om form hålls.
3. Pressa upp, knän följer tår.
Cues: Bröst upp. Knän ut. Tryck golvet bort.
Vanliga fel: Knän in, faller fram, tappar bål.
Rek/tempo: 6-12 reps. 3 s ner / 1-2 s upp.`,

    "gångutfall hantlar": `Startposition: Hantlar vid sida, bål spänd.
Utförande:
1. Kliv fram ett lagom långt steg.
2. Sänk rakt ner så bakre knä nästan nuddar golv.
3. Pressa upp genom främre hälen och kliv vidare.
Cues: Hög överkropp. Främre knä över fot.
Vanliga fel: För kort steg (knä långt fram), tappar balans, lutar fram.
Rek/tempo: 8-14 steg/ben. 2-3 s ner / 1 s upp.`,

    "benspark leg extension": `Startposition: Knä i linje med maskinens led. Dyna på smalbenet.
Utförande: Sträck knäna upp, pausa 1 s, sänk långsamt.
Cues: Lyft med framlår. Kontrollerad botten.
Vanliga fel: Studsar, för tungt så höften lyfter.
Rek/tempo: 10-15 reps. 1-2 s upp / 3 s ner.`,

    "sittande bencurl": `Startposition: Knä i linje med maskinled. Rygg mot stöd.
Utförande: Dra ner med baksida lår, pausa, släpp upp långsamt.
Cues: Håll höfterna stilla. Full sträck i toppen.
Vanliga fel: Lyfter rumpa, kortar ROM.
Rek/tempo: 10-15 reps. 2 s ner / 3 s upp.`,

    "liggande eller stående bencurl": `Startposition: Ligg/stå så knäleden linjerar med maskinen.
Utförande: Böj knä mot rumpa, pausa, sänk långsamt.
Cues: Pressa höfterna ner i dynan (liggande).
Vanliga fel: Svankar/lyfter höft, rycker.
Rek/tempo: 10-15 reps. 2 s upp / 3 s ner.`,

    "militärpress skivstång eller hantlar": `Startposition: Stå/sitt, bål spänd, handleder raka.
Utförande:
1. Pressa vikten rakt upp över huvudet.
2. I toppen: vikten över mittfoten, bål fortfarande spänd.
3. Sänk kontrollerat till axelhöjd/nyckelben.
Cues: Revben ner. Pressa upp och under huvudet.
Vanliga fel: Överdriven svank, pressar framför kroppen.
Rek/tempo: 6-10 reps. 2 s ner / 1-2 s upp.`,

    "stående sidolyft hantlar": `Startposition: Lätt böjda armbågar, hantlar vid sidor.
Utförande: Lyft ut till axelhöjd, pausa kort, sänk långsamt.
Cues: Lätt framåttilt i överkropp. Lilla fingret lite högre än tummen (mjuk vinkel).
Vanliga fel: Gungar, lyfter axlar mot öron, går för högt.
Rek/tempo: 12-20 reps. 2 s upp / 3 s ner.`,

    "rear delt fly maskin eller böjd hantelvariant": `Startposition: Luta fram (hantel) eller sitt i maskin med bröst mot stöd.
Utförande: För armar ut/bak tills skulderblad dras ihop, pausa, tillbaka kontrollerat.
Cues: Dra armbågarna utåt. Axlar ner.
Vanliga fel: Rycker, för tungt så det blir ryggrodd.
Rek/tempo: 12-20 reps. 2 s upp / 3 s ner.`,

    "upright row kabel": `Startposition: Kabel längst ner, grepp nära. Stå upprätt.
Utförande: Dra upp längs kroppen tills armbågar når ungefär axelhöjd, sänk långsamt.
Cues: Armbågar upp och ut. Handleder under armbågar.
Vanliga fel: Drar för högt (kan irritera axel), rycker.
Rek/tempo: 10-15 reps. 2 s upp / 3 s ner.`,

    "plankan": `Startposition: Armbågar under axlar, tår i golv.
Utförande: Spänn mage + säte och håll rak linje huvud-höft-häl. Andas lugnt.
Cues: Dra naveln lätt in. Knip sätet. Pressa underarmar ner.
Vanliga fel: Hänger i ländrygg, höften för högt, håller andan.
Rek/tempo: 20-60 sek x 2-4 set.`,

    "hängande benlyft eller dead bug": `Hängande benlyft:
Startposition: Häng stabilt, skulderblad lätt neddragna (inte häng i axlarna).
Utförande: Lyft knän/ben utan gung, pausa, sänk långsamt.
Cues: Bäckenet tippas bak. Ingen sving.
Vanliga fel: Gungar, drar med höftböjare utan bål.
Rek: 6-12 reps, 2 s upp / 3 s ner.

Dead bug:
Startposition: Ligg på rygg, armar upp, knän 90°. Ländrygg lätt mot golv.
Utförande: Sträck motsatt arm/ben långsamt utan att ländrygg släpper, tillbaka och växla.
Cues: Pressa ländrygg lätt ner. Långsamt.
Rek: 6-10/side.`,

    "sidoplanka": `Startposition: Armbåge under axel, ben raka.
Utförande: Pressa höften upp och håll kroppen rak. Andas kontrollerat.
Cues: Höft fram. Knip sätet.
Vanliga fel: Höften bak/ner, axeln kollapsar.
Rek: 20-45 sek/side x 2-4.`,

    "rumänskt marklyft rdl": `Startposition: Stå höftbrett, stång/hantlar mot framsida lår. Knän lätt böjda.
Utförande:
1. Skjut höften bak (som att stänga en bildörr med rumpan).
2. Stången glider nära benen till under knä/mitten av smalben (med neutral rygg).
3. Pressa fram höften och stå upp.
Cues: Ryggen låst. Tryck hälar i golv. Känn stretch i baksida lår.
Vanliga fel: Böjer för mycket i knä, rundar rygg, tappar stången från kroppen.
Rek/tempo: 6-12 reps. 3 s ner / 1-2 s upp.`,

    "hip thrust skivstång eller maskin": `Startposition: Övre rygg mot bänk, fötter axelbrett. Stång över höften (med vaddering).
Utförande:
1. Sänk höften kontrollerat.
2. Pressa upp tills knä-höft-axel nästan är i linje.
3. Pausa 1-2 s och spänn sätet hårt, sänk igen.
Cues: Hakan lätt in. Revben ner. Tryck genom hälar.
Vanliga fel: Översträcker ländrygg i toppen, fötter för långt fram/bak, studsar.
Rek/tempo: 8-12 reps. 2 s upp / 2 s paus / 2 s ner.`,

    "kabeltryckning triceps handfäste": `Startposition: Stå lätt framåtlutad, armbågar intill kroppen.
Utförande:
1. Pressa ner tills armarna är raka.
2. Pausa 1 s och spänn triceps.
3. Låt handtaget gå upp kontrollerat tills underarmarna är ca parallella med golvet.
Cues: Armbågar låsta vid sidan. Rör bara underarmen.
Vanliga fel: Armbågar glider fram, tar hjälp av kroppsvikt.
Rek/tempo: 10-15 reps. 2 s ner / 3 s upp.`,

    "stångcurl eller maskincurl": `Startposition: Stabil hållning, armbågar nära sidan.
Utförande: Curl upp, pausa, sänk långsamt till full sträck.
Cues: Axlar bak. Ingen gung.
Vanliga fel: Lutar bak, släpper ner snabbt.
Rek/tempo: 8-12 reps. 2 s upp / 3 s ner.`,

    "skullcrusher eller triceps overhead": `Skullcrusher (liggande):
Startposition: Ligg på bänk, armar rakt upp.
Utförande: Böj bara armbågar och sänk vikten mot panna/bakom huvud, pressa upp.
Cues: Armbågar pekar upp. Överarm still.
Vanliga fel: Armbågar flyter isär, för kort ROM.
Rek: 8-12 reps. 3 s ner / 1-2 s upp.

Triceps overhead (kabel/hantel):
Startposition: Armar över huvudet, armbågar nära.
Utförande: Sträck armbågar, sänk långsamt bakom huvud.
Cues: Håll armbågarna tajt.
Rek: 10-15 reps.`,

    "fst-stil sidolyft": `Startposition: Stå upprätt med hantlar vid sidan, armbågar lätt böjda. Välj mycket lätt vikt.
Utförande: Lyft ut till axelhöjd, sänk långsamt utan vila i botten.
Cues: Ingen gung. Axlar ner. Kontroll hela vägen.
Vanliga fel: För tungt, ryck, kort rörelse.
Rek/tempo (FST): 5-7 set x 10-15 reps, vila 20-30 s. Tempo 2 s upp / 3 s ner.`,
  };

  const home = {
    "kroppsviktssquats": `Startposition: Fötter axelbrett, tår lite ut. Bröst upp.
Utförande: Sätt dig ner/bak tills höften under kontroll, pressa upp.
Cues: Knän följer tår. Hela foten i golv.
Vanliga fel: Knän faller in, hälar lyfter, rundar rygg.
Rek/tempo: 12-25 reps, 3 s ner / 1 s upp.`,

    "bulgariansk utfall": `Startposition: Bakre fot på stol/soffa. Främre fot så du kan gå rakt ner.
Utförande: Sänk rakt ner tills främre lår nära parallellt, pressa upp genom främre hälen.
Cues: Hög torso. Knä över fot.
Vanliga fel: För kort steg, tappar balans, pressar från bakre ben.
Rek/tempo: 8-12/ben, 3 s ner.`,

    "hantelknäböj goblet squat": `Startposition: Håll hantel vid bröstet, armbågar ned.
Utförande: Knäböj djupt med bröst upp, pressa upp.
Cues: Armbågar mellan knän i botten.
Vanliga fel: Tappar bröst, hälar lyfter.
Rek: 8-15 reps.`,

    "benspark bodyweight": `Startposition: Sitt på stol/soffa eller på golv med stöd bakom.
Utförande: Sträck ett ben rakt, spänn framlår 1 s, sänk långsamt.
Cues: Tå upp. Kontrollerat.
Vanliga fel: Snabbt upp/ner utan spänn.
Rek: 15-30/ben.`,

    "nordic curl eller hälbänd": `Nordic curl:
Startposition: Knä på mjukt underlag, fötter fast under soffa/partner håller.
Utförande: Sänk kroppen framåt så långsamt du kan med rak kropp, ta emot med händer och dra tillbaka med baksida lår.
Cues: Rak linje knä-höft-axel.
Vanliga fel: Bryter i höften, faller utan kontroll.
Rek: 3-8 reps, 4-6 s ner.

Hälbänd (hamstring curl med hälar på handduk):
Startposition: Ligg på rygg, hälar på handduk på glatt golv, höft lyft.
Utförande: Dra hälar mot rumpa, sträck ut igen utan att tappa höften.
Rek: 8-15 reps.`,

    "hip thrust med hantel eller kroppsvikt": `Startposition: Övre rygg mot soffa/bänk. Hantel över höft (om vikt).
Utförande: Sänk, pressa upp, pausa och spänn säte, ner igen.
Cues: Knip sätet i toppen. Revben ner.
Vanliga fel: Svankar i toppen.
Rek: 10-20 reps.`,

    "rumänskt marklyft hantlar rdl": `Startposition: Hantlar mot framsida lår, knän lätt böjda.
Utförande: Höft bak, hantlar nära ben, känn stretch, höft fram.
Cues: Neutral rygg. Långsam ner.
Rek: 8-12 reps, 3 s ner.`,

    "liggande bencurl med hälbänd": `Startposition: Ligg på rygg, hälar på stol/handduk, höft upp.
Utförande: Dra hälar mot rumpa, håll höft uppe, sträck ut långsamt.
Cues: Höften får inte sjunka.
Rek: 10-15 reps.`,

    "armåtning hantel": `Startposition: Luta fram, stöd vid behov på knä/bänk. Överarm parallell med kroppen.
Utförande: Sträck armbågen bak tills armen är rak, pausa, tillbaka.
Cues: Överarm stilla. Bara underarm rör sig.
Vanliga fel: Svingar, tappar överarmen.
Rek: 12-20/arm.`,

    "liggande rodd under bord": `Startposition: Under stabilt bord, greppa kanten, kroppen rak.
Utförande: Dra bröstet mot bordet, pausa, sänk kontrollerat.
Cues: Kroppen som en planka. Skulderblad ihop.
Vanliga fel: Höften hänger, rycker.
Rek/tempo: 6-15 reps. 2 s upp / 3 s ner.`,

    "band rodd": `Startposition: Band fäst framför dig. Stå/sitt med armar fram.
Utförande: Dra mot magen, skulderblad ihop, tillbaka långsamt.
Cues: Skulderblad först.
Rek: 12-20 reps.`,

    "pull-ups eller negativa chin-ups": `Pull-ups:
Startposition: Häng med aktiva skuldror (lätt neddragna).
Utförande: Dra hakan över stång, sänk helt kontrollerat.
Cues: Bröst mot stång. Ingen sving.
Rek: 3-8 reps.

Negativa chin-ups:
Startposition: Hoppa upp till toppläge.
Utförande: Sänk långsamt 3-6 sek till helt utsträckta armar.
Rek: 3-6 reps.`,

    "marklyft hantlar": `Startposition: Hantlar vid sidan, fötter höftbrett.
Utförande: Böj höft/knä, ta hantlar nära golv, pressa upp till rak kropp.
Cues: Neutral rygg. Tryck genom hälar.
Rek: 6-12 reps.`,

    "armhävningar brett grepp": `Startposition: Händer bredare än axlar, kropp rak.
Utförande: Sänk bröstet mot golv, pressa upp.
Cues: Spänn mage/säte. Armbågar ca 45-70°.
Vanliga fel: Svankar, kort ROM.
Rek: 8-20 reps.`,

    "armhävningar lutande bänk": `Startposition: Händer på bänk/stol (högre = lättare).
Utförande: Samma som armhävning men på lutning.
Cues: Spänn mage/säte. Kontrollerad botten.
Vanliga fel: Svank, kort rörelse.
Rek: 10-25 reps.`,

    "hantelfly liggande": `Startposition: Ligg på golv/bänk, hantlar ovan bröst, lätt böjda armbågar.
Utförande: Öppna armar i båge, sträck bröst, tillbaka till mitten.
Cues: Håll armbågsvinkel. Kontrollerad botten.
Rek/tempo: 10-15 reps, 3 s ner.`,

    "hammarcurl": gym["hammarcurl"],

    "hantelcurl": `Startposition: Stå rakt, armbågar vid sidan.
Utförande: Curl upp, pausa, sänk långsamt.
Cues: Armbågar stilla. Ingen gung.
Rek: 8-12 reps.`,

    "koncentrationscurl": gym["koncentrationscurl"],

    "axelpress hantlar sittande": `Startposition: Sitt stabilt, hantlar vid axlar.
Utförande: Pressa upp över huvudet, sänk till axlar.
Cues: Revben ner. Raka handleder.
Rek: 6-12 reps.`,

    "sidolyft hantlar": gym["stående sidolyft hantlar"],

    "böjd flyover hantlar": `Startposition: Höftfällning, neutral rygg.
Utförande: Lyft armar ut/bak, pausa, sänk.
Cues: Armbågarna leder rörelsen. Axlar ner.
Vanliga fel: Ryck, för tungt.
Rek: 12-20 reps.`,

    "upright row hantlar": `Startposition: Hantlar framför lår.
Utförande: Dra upp så armbågar når ca axelhöjd, sänk kontrollerat.
Cues: Armbågar leder.
Vanliga fel: För hög dragväg, ryck.
Rek: 10-15 reps.`,

    "plankan": gym["plankan"],

    "benlyft liggande": `Startposition: Ligg på rygg, händer under rumpa vid behov.
Utförande: Lyft raka (eller lätt böjda) ben till ca 70-90°, sänk långsamt utan att ländrygg släpper.
Cues: Ländrygg mot golv. Långsam ner.
Vanliga fel: Sänker för snabbt, svankar.
Rek/tempo: 8-15 reps, 3 s ner.`,

    "sidoplanka": gym["sidoplanka"],

    "tricepsdipar på stol": `Startposition: Händer på stol bakom dig, fötter i golv.
Utförande: Sänk kroppen genom att böja armbågar till ca 90°, pressa upp.
Cues: Axlar bak. Armbågar pekar bak.
Vanliga fel: Går för djupt (axelstress), axlar åker upp.
Rek: 8-15 reps.`,

    "skull crusher hantlar": `Startposition: Ligg på golv/bänk, hantlar rakt upp.
Utförande: Böj armbågar, sänk hantlar mot sida av huvud, sträck upp.
Cues: Överarm still.
Rek/tempo: 8-15 reps, 3 s ner.`,

    "hantelcurl växelvis": `Startposition: Stå rakt, en hantel i varje hand.
Utförande: Curl en arm i taget, andra armen still.
Cues: Ingen rotation i torso.
Vanliga fel: Gungar, tappar hållning.
Rek: 8-12/arm.`,

    "tåhävningar kroppsvikt": `Startposition: Stå på plan yta eller trappkant (bättre ROM).
Utförande: Upp på tå, pausa 1 s, ner i stretch 2-3 s.
Cues: Rakt upp/ner. Kontrollerad stretch.
Rek: 15-30 reps.`,

    "gångutfall hantlar": gym["gångutfall hantlar"],
    "fst-stil sidolyft": gym["fst-stil sidolyft"],
  };

  window.EXERCISE_GUIDES = { gym, hemma: home };
})();
