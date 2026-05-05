// Statisk recepttext per meal key.
// Nycklarna matchar keys i app.js (frukost/lunch/middag/mellis).
// Exempel:
// "lunch-kyckling": "1. Stek kyckling...\n2. Koka quinoa..."
(function () {
  window.MEAL_RECIPES = {
    "frukost-omelett": {
      source: "Källa: WR Måltider dag 1-21_augusti.htm (bildexport)",
      notes: "Manuellt extraherat ur bildbaserad HTML-export.",
      photoImage: "WR Måltider dag 1-21_augusti_files/image016.gif",
      detailImage: "WR Måltider dag 1-21_augusti_files/image018.gif",
      transcript: {
        servings: "1 maltid",
        ingredients: [
          "1 nypa spenat eller broccoli",
          "2 avokado",
          "1 tsk olivolja",
          "3 agg",
          "1 msk keso",
          "1 nypa bladspenat"
        ],
        seasoning: ["Farsk basilika", "Svartpeppar"],
        steps: [
          "Forbered gronsaken genom att skara den pa langden.",
          "Vispa agg med olivolja och kryddor.",
          "Stek i stekpanna pa medelvarme och lagg i gronsakerna.",
          "Nar ena sidan satt sig kan du lagga spenaten pa ena halvan och vika over andra halvan."
        ]
      }
    },
    "lunch-lax": {
      source: "Källa: WR Måltider dag 1-21_augusti.htm (bildexport)",
      notes: "Partial transcript extracted manually from image012.",
      photoImage: "WR Måltider dag 1-21_augusti_files/image010.gif",
      detailImage: "WR Måltider dag 1-21_augusti_files/image012.gif",
      transcript: {
        servings: "2 maltider",
        ingredients: [
          "2 naver blandad bladgronsallad eller mort kold",
          "2 morotter, strimlade",
          "2 msk japansk soja",
          "1 tsk sesamolja",
          "1/2 salladslok",
          "1,5 lime, saft",
          "4 avokado eller mango",
          "100 g shiratakinudlar"
        ],
        seasoning: ["Farsk koriander", "Flingsalt"],
        steps: [
          "Vispa ihop soja, sesamolja, rostad sesamfro och chiliflakes med tunt skivad salladslok i en bunke.",
          "Lat blandningen sta medan du gor resten av receptet.",
          "Toppa med koriander och rostad sesam. Njut."
        ]
      }
    },
    "lunch-kalkonwok": {
      source: "Källa: WR Måltider dag 1-21_augusti.htm (bildexport)",
      notes: "Partial transcript extracted manually from image009.",
      photoImage: "WR Måltider dag 1-21_augusti_files/image007.gif",
      detailImage: "WR Måltider dag 1-21_augusti_files/image009.gif",
      transcript: {
        servings: "2 maltider",
        ingredients: [
          "200 g halloumi eller tofu",
          "1 paprika",
          "1 broccolihuvud",
          "Shiitake eller annan svamp",
          "1 pak choi",
          "1 paket shiratakinudlar",
          "1 msk sesamolja",
          "2 dl kokosmjolk",
          "1/2 lime",
          "1 msk jordnotssmor"
        ],
        steps: [
          "Skolj gronsakerna i rinnande kallt vatten och skar i mindre bitar.",
          "Hetta upp olja i stekpanna eller wok och fras pa halloumi eller tofu tills gyllene.",
          "Blanda i resterande ingredienser med lime och woksa pa lag varme."
        ]
      }
    },
    "middag-torsk": {
      source: "Källa: WR Måltider dag 1-21_augusti.htm (bildexport)",
      notes: "Partial transcript extracted manually from image006.",
      photoImage: "WR Måltider dag 1-21_augusti_files/image004.gif",
      detailImage: "WR Måltider dag 1-21_augusti_files/image006.gif",
      transcript: {
        servings: "2 maltider",
        ingredients: [
          "2 handflatsstorlekar torskfile eller lax",
          "1 citron",
          "1 dl pressad vitlok",
          "2 tsk olivolja",
          "1 zucchini",
          "2 nangar blad broccoli",
          "1 dl naturell kokosyoghurt"
        ],
        seasoning: ["Salt", "Svartpeppar", "Cayennepeppar", "Paprikapulver"],
        steps: [
          "Forvarm ugnen till 220 C.",
          "Hall oljan i en ugnsfast form och lagg i fisken.",
          "Pressa eller riv vitlok over fisken och krydda.",
          "Tillaga i ugnen i cirka 10-15 minuter.",
          "Koka eller stromkoka broccoli mjuk och mixa med yoghurt och kryddor till puree."
        ]
      }
    },
    "middag-kycklinggryta": {
      source: "Källa: WR Måltider dag 1-21_augusti.htm (bildexport)",
      notes: "Partial transcript extracted manually from image015.",
      photoImage: "WR Måltider dag 1-21_augusti_files/image013.gif",
      detailImage: "WR Måltider dag 1-21_augusti_files/image015.gif",
      transcript: {
        servings: "1 maltid",
        ingredients: [
          "1 handflatsstor kycklingfile",
          "1 msk sesamolja",
          "1/2 gul paprika",
          "1 vitloksklyfta",
          "Ingefara",
          "Lime",
          "Zucchini"
        ],
        seasoning: ["Chiliflakes", "Koriander", "Salt"],
        steps: [
          "Forbered din zucchini genom att skala strimlor med osthyvel.",
          "Varm upp sesamolja i en stekpanna och tillsatt skivad ingefara, vitlok och paprika.",
          "Lagg i kycklingen och lat steka pa medelvarme tills den ar genomstekt.",
          "Toppa med hackade notter och farska orter."
        ]
      }
    },
    "middag-halloumi": {
      source: "Källa: WR Måltider dag 1-21_augusti.htm (bildexport)",
      notes: "Partial transcript extracted manually from image070.",
      detailImage: "WR Måltider dag 1-21_augusti_files/image070.gif",
      transcript: {
        servings: "1 maltid",
        ingredients: [
          "1 handflatsstor kyckling eller halloumi",
          "1 nave haricots verts",
          "1 citron",
          "2 msk olivolja",
          "3 msk grekisk yoghurt"
        ],
        seasoning: ["Svartpeppar", "Havssalt", "Chiliflakes"],
        steps: [
          "Krydda kycklingen med svartpeppar och chiliflakes, eller oregano om du anvander halloumi.",
          "Stek kycklingen tills den ar klar och hall i citron over strax innan servering.",
          "Blanda grekisk yoghurt med curry och lite salt om du vill.",
          "Toppa maten med pressad citron, mer svartpeppar och chili."
        ]
      }
    }
  };
})();
