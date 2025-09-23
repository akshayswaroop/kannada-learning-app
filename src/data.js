// Data module for Kannada Flashcards
// Exports: RAW_CARDS, KAN_TO_HI, KAN_MATRAS, HI_TO_KAN, HI_MATRAS, PROFILES, BASE_STATS_KEY, TV_BASE_KEY

export const BASE_STATS_KEY = "kannada_glyph_stats_v1";
export const TV_BASE_KEY = "kannada_tv_minutes_v1";

export const PROFILES = ["Mishika", "Akshay", "Eva"];

// 200 common English words suitable for early readers (Senior KG)
export const ENGLISH_WORDS = [
  "a","about","after","again","all","am","an","and","any","are",
  "as","at","away","back","be","because","been","before","big","boy",
  "but","by","call","came","can","come","could","day","did","do",
  "down","each","find","first","for","from","funny","girl","give","go",
  "had","has","have","he","help","her","here","him","his","how",
  "I","if","in","into","is","it","jump","just","know","like",
  "little","look","make","many","me","more","my","new","no","not",
  "now","of","on","one","only","or","other","out","over","people",
  "play","put","red","run","said","see","she","so","some","take",
  "than","that","the","their","them","then","there","they","this","three",
  "to","two","up","us","use","very","was","we","were","what",
  "when","where","which","who","will","with","words","would","write","yes",
  "you","your","yellow","blue","green","black","white","brown","school","home",
  "book","cat","dog","mom","dad","baby","ball","car","bus","bike",
  "apple","banana","milk","water","bread","egg","cake","cookie","walk","sing",
  "read","draw","cut","open","close","small","tall","short","long","hot",
  "cold","warm","old","new","happy","sad","good","bad","kind","friend",
  "fun","game","time","lunch","snack","rain","sun","snow","night","today",
  "tomorrow","yesterday","near","far","slow","fast","stop","go","start","end",
  "inside","outside","top","bottom","under","over","left","right","above","below",
  "around","across","early","late","family","sister","brother","teacher","class","number",
  "color","shape","circle","square","triangle","rectangle","animal","flower","garden","park",
  "street","house","door","window","table","chair","bed","room","schoolbag","pencil",
  "pen","paper","crayon","bookcase","clock","shoe","sock","shirt","pants","coat",
  "hat","glove","playground","friendship","story","picture","laugh","smile","thank","please"
];

export const RAW_CARDS = [
  { id: "rama", wordKannada: "ರಾಮ", transliteration: "Rāma", transliterationHi: "राम" },
  { id: "seeta", wordKannada: "ಸೀತಾ", transliteration: "Sītā", transliterationHi: "सीता" },
  { id: "lakshmana", wordKannada: "ಲಕ್ಷ್ಮಣ", transliteration: "Lakṣmaṇa", transliterationHi: "लक्ष्मण" },
  { id: "bharata", wordKannada: "ಭರತ", transliteration: "Bharata", transliterationHi: "भरत" },
  { id: "shatrughna", wordKannada: "ಶತ್ರುಘ್ನ", transliteration: "Śatrughna", transliterationHi: "शत्रुघ्न" },
  { id: "dasharatha", wordKannada: "ದಶರಥ", transliteration: "Daśaratha", transliterationHi: "दशरथ" },
  { id: "kausalyaa", wordKannada: "ಕೌಸಲ್ಯಾ", transliteration: "Kausalyā", transliterationHi: "कौसल्या" },
  { id: "kaikeyii", wordKannada: "ಕೈಕೇಯೀ", transliteration: "Kaikeyī", transliterationHi: "कैकेयी" },
  { id: "sumitra", wordKannada: "ಸುಮಿತ್ರ", transliteration: "Sumitrā", transliterationHi: "सुमित्रा" },
  { id: "janaka", wordKannada: "ಜನಕ", transliteration: "Janaka", transliterationHi: "जनक" },
  { id: "vishvamitra", wordKannada: "ವಿಶ್ವಾಮಿತ್ರ", transliteration: "Viśvāmitra", transliterationHi: "विश्वामित्र" },
  { id: "agastya", wordKannada: "ಅಗಸ್ತ್ಯ", transliteration: "Agastya", transliterationHi: "अगस्त्य" },
  { id: "hanuman", wordKannada: "ಹನುಮಾನ", transliteration: "Hanumān", transliterationHi: "हनुमान" },
  { id: "sugreeva", wordKannada: "ಸುಗ್ರೀವ", transliteration: "Sugrīva", transliterationHi: "सुग्रीव" },
  { id: "vali", wordKannada: "ವಾಲೀ", transliteration: "Vālī", transliterationHi: "वाली" },
  { id: "jambavan", wordKannada: "ಜಾಂಬವಾನ್", transliteration: "Jāmbavān", transliterationHi: "जाम्भवान" },
  { id: "angada", wordKannada: "ಅಂಗದ", transliteration: "Aṅgada", transliterationHi: "अंगद" },
  { id: "vibhishana", wordKannada: "ವಿಭೀಷಣ", transliteration: "Vibhīṣaṇa", transliterationHi: "विभीषण" },
  { id: "ravana", wordKannada: "ರಾವಣ", transliteration: "Rāvaṇa", transliterationHi: "रावण" },
  { id: "mandodari", wordKannada: "ಮಂದೋದರೀ", transliteration: "Mandodarī", transliterationHi: "मंदोदरी" },
  { id: "meghanada", wordKannada: "ಮೇಘನಾದ", transliteration: "Meghanāda", transliterationHi: "मेघनाद" },
  { id: "indrajit", wordKannada: "ಇಂದ್ರಜಿತ್", transliteration: "Indrajit", transliterationHi: "इंद्रजित" },
  { id: "kumbhakarna", wordKannada: "ಕುಂಭಕರ್ಣ", transliteration: "Kumbhakarṇa", transliterationHi: "कुंभकर्ण" },
  { id: "shurpanakha", wordKannada: "ಶೂರ್ಪಣಖಾ", transliteration: "Śūrpaṇakhā", transliterationHi: "शूर्पणखा" },
  { id: "maricha", wordKannada: "ಮಾರೀಚ", transliteration: "Mārīca", transliterationHi: "मारिच" },
  { id: "tadaka", wordKannada: "ತಾಡಕಾ", transliteration: "Tāḍakā", transliterationHi: "ताड़का" },
  { id: "ahilya", wordKannada: "ಅಹಿಲ್ಯಾ", transliteration: "Ahalyā", transliterationHi: "अहल्या" },
  { id: "gautama", wordKannada: "ಗೌತಮ", transliteration: "Gautama", transliterationHi: "गौतम" },
  { id: "jatayu", wordKannada: "ಜಟಾಯು", transliteration: "Jaṭāyu", transliterationHi: "जटायु" },
  { id: "sampati", wordKannada: "ಸಂಪಾತೀ", transliteration: "Sampātī", transliterationHi: "संपाती" },
  { id: "nala", wordKannada: "ನಲ", transliteration: "Nala", transliterationHi: "नल" },
  { id: "nila", wordKannada: "ನೀಲ", transliteration: "Nīla", transliterationHi: "नील" },
  { id: "lava", wordKannada: "ಲವ", transliteration: "Lava", transliterationHi: "लव" },
  { id: "kusha", wordKannada: "ಕುಶ", transliteration: "Kusha", transliterationHi: "कुश" },
  { id: "urmila", wordKannada: "ಉರ್ಮಿಲಾ", transliteration: "Urmila", transliterationHi: "उर्मिला" },
  { id: "mandavi", wordKannada: "ಮಾಂಡವೀ", transliteration: "Mandavi", transliterationHi: "मांडवी" },
  { id: "shrutakirti", wordKannada: "ಶ್ರುತಕೀರ್ತಿ", transliteration: "Shrutakirti", transliterationHi: "श्रुतकीर्ति" },
  { id: "vashistha", wordKannada: "ವಶಿಷ್ಠ", transliteration: "Vashistha", transliterationHi: "वशिष्ठ" },
  { id: "vishrava", wordKannada: "ವಿಶ್ರವ", transliteration: "Vishrava", transliterationHi: "विश्रव" },
  { id: "narada", wordKannada: "ನಾರದ", transliteration: "Narada", transliterationHi: "नारद" },
  { id: "valmiki", wordKannada: "ವಾಲ್ಮೀಕಿ", transliteration: "Valmiki", transliterationHi: "वाल्मीकि" },
  { id: "garuda", wordKannada: "ಗರುಡ", transliteration: "Garuda", transliterationHi: "गरुड़" },
  { id: "khara", wordKannada: "ಖರ", transliteration: "Khara", transliterationHi: "खर" },
  { id: "dushana", wordKannada: "ದೂಷಣ", transliteration: "Dushana", transliterationHi: "दूषण" },
  { id: "trishira", wordKannada: "ತ್ರಿಶಿರಾ", transliteration: "Trishira", transliterationHi: "त्रिशिरा" },
  { id: "akampana", wordKannada: "ಅಕಂಪನ", transliteration: "Akampana", transliterationHi: "अकंपन" },
  { id: "atikaya", wordKannada: "ಅतಿಕಾಯ", transliteration: "Atikaya", transliterationHi: "अतिकाय" },
  { id: "prahasta", wordKannada: "ಪ್ರಹಸ್ತ", transliteration: "Prahasta", transliterationHi: "प्रहस्त" },
  { id: "kabandha", wordKannada: "ಕಬಂಧ", transliteration: "Kabandha", transliterationHi: "कबन्ध" },
  { id: "mandhara", wordKannada: "ಮಂಥರಾ", transliteration: "Mandhara", transliterationHi: "मंथरा" },
  { id: "tara", wordKannada: "ತಾರಾ", transliteration: "Tara", transliterationHi: "तारा" },
  { id: "dilli", wordKannada: "ದಿಲ್ಲೀ", transliteration: "Dillī", transliterationHi: "दिल्ली" },
  { id: "mumbai", wordKannada: "ಮುಂಬಈ", transliteration: "Mumbaī", transliterationHi: "मुंबई" },
  { id: "bangal", wordKannada: "ಬಂಗಾಲ", transliteration: "Bangāl", transliterationHi: "बंगाल" },
  { id: "tamilnadu", wordKannada: "ತಮಿಲನಾಡು", transliteration: "Tamilnāḍu", transliterationHi: "तमिलनाडु" },
  { id: "uttarpradesh", wordKannada: "ಉತ್ತರ ಪ್ರದೇಶ", transliteration: "Uttar Pradeś", transliterationHi: "उत्तर प्रदेश" },
  { id: "gujarat", wordKannada: "ಗುಜರಾತ", transliteration: "Gujarāt", transliterationHi: "गुजरात" },
  { id: "punjab", wordKannada: "ಪಂಜಾಬ", transliteration: "Panjāb", transliterationHi: "पंजाब" },
  { id: "maharashtra", wordKannada: "ಮಹಾರಾಷ್ಟ್ರ", transliteration: "Mahārāshṭra", transliterationHi: "महाराष्ट्र" },
  { id: "kerala", wordKannada: "ಕೇರಲ", transliteration: "Kerala", transliterationHi: "केरल" },
  { id: "karnataka", wordKannada: "ಕರ್ನಾಟಕ", transliteration: "Karṇāṭaka", transliterationHi: "कर्नाटक" },
  { id: "am", wordKannada: "ಆಮ", transliteration: "Ām", transliterationHi: "आम" },
  { id: "sebab", wordKannada: "ಸೇಬ", transliteration: "Seb", transliterationHi: "सेब" },
  { id: "kela", wordKannada: "ಕೇಲಾ", transliteration: "Kelā", transliterationHi: "केला" },
  { id: "angoor", wordKannada: "ಅಂಗೂರ", transliteration: "Angoor", transliterationHi: "अंगूर" },
  { id: "anar", wordKannada: "ಅನಾರ", transliteration: "Anār", transliterationHi: "अनार" },
  { id: "nariyal", wordKannada: "ನಾರಿಯಲ", transliteration: "Nāriyal", transliterationHi: "नारियल" },
  { id: "ananas", wordKannada: "ಅನಾನಾಸ", transliteration: "Anānās", transliterationHi: "अनानास" },
  { id: "angutha", wordKannada: "ಅಂಗೂಠಾ", transliteration: "Angūṭhā", transliterationHi: "अंगूठा" },
  { id: "somavar", wordKannada: "ಸೋಮವಾರ", transliteration: "Somavār", transliterationHi: "सोमवार" },
  { id: "mangalvar", wordKannada: "ಮಂಗಲವಾರ", transliteration: "Mangalvār", transliterationHi: "मंगलवार" },
  { id: "budhvar", wordKannada: "ಬುಧವಾರ", transliteration: "Budhvār", transliterationHi: "बुधवार" },
  { id: "guruvaar", wordKannada: "ಗುರುವಾರ", transliteration: "Guruvār", transliterationHi: "गुरुवार" },
  { id: "shukrvar", wordKannada: "ಶುಕ್ರವಾರ", transliteration: "Shukravār", transliterationHi: "शुक्रवार" },
  { id: "shanivar", wordKannada: "ಶನಿವಾರ", transliteration: "Shanivār", transliterationHi: "शनिवार" },
  { id: "ravivar", wordKannada: "ರವಿವಾರ", transliteration: "Ravivār", transliterationHi: "रविवार" },
  { id: "pani", wordKannada: "ಪಾನೀ", transliteration: "Pānī", transliterationHi: "पानी" },
  { id: "khana", wordKannada: "ಖಾನಾ", transliteration: "Khānā", transliterationHi: "खाना" },
  { id: "skool", wordKannada: "ಸ್ಕೂಲ", transliteration: "Skūl", transliterationHi: "स्कूल" },
  { id: "kitaab", wordKannada: "ಕಿತಾಬ", transliteration: "Kitāb", transliterationHi: "किताब" },
  { id: "dost", wordKannada: "ದೋಸ್ತ", transliteration: "Dost", transliterationHi: "दोस्त" },
  { id: "parivar", wordKannada: "ಪರಿವಾರ", transliteration: "Parivār", transliterationHi: "परिवार" },
  { id: "ghar", wordKannada: "ಘರ", transliteration: "Ghar", transliterationHi: "घर" },
  { id: "sarak", wordKannada: "ಸಡ಼ಕ", transliteration: "Saṛak", transliterationHi: "सड़क" },
  { id: "bazar", wordKannada: "ಬಾಜ಼ಾರ", transliteration: "Bāzār", transliterationHi: "बाज़ार" },
  { id: "aspatal", wordKannada: "ಅಸ್ಪತಾಲ", transliteration: "Aspatāl", transliterationHi: "अस्पताल" },
  { id: "mandir", wordKannada: "ಮಂದಿರ", transliteration: "Mandir", transliterationHi: "मंदिर" },
  { id: "naukri", wordKannada: "ನೌಕರೀ", transliteration: "Nauk­rī", transliterationHi: "नौकरी" },
  { id: "samay", wordKannada: "ಸಮಯ", transliteration: "Samay", transliterationHi: "समय" },
  { id: "din", wordKannada: "ದಿನ", transliteration: "Din", transliterationHi: "दिन" },
  { id: "raat", wordKannada: "ರಾತ", transliteration: "Rāt", transliterationHi: "रात" },
  { id: "aankh", wordKannada: "ಆಁಖ", transliteration: "Ā̃kh", transliterationHi: "आँख" },
  { id: "haath", wordKannada: "ಹಾಥ", transliteration: "Hāth", transliterationHi: "हाथ" },
  { id: "pair", wordKannada: "ಪೈರ", transliteration: "Pair", transliterationHi: "पैर" },
  { id: "bolna", wordKannada: "බೋಲನಾ", transliteration: "Bolnā", transliterationHi: "बोलना" },
  { id: "sunnā", wordKannada: "ಸುನನಾ", transliteration: "Sunnā", transliterationHi: "सुनना" },
  { id: "dekhna", wordKannada: "ದೇಖನಾ", transliteration: "Dekhnā", transliterationHi: "देखना" },
  { id: "ānā", wordKannada: "ಆನಾ", transliteration: "Ānā", transliterationHi: "आना" },
  { id: "jānā", wordKannada: "ಜಾನಾ", transliteration: "Jānā", transliterationHi: "जाना" },
  { id: "kaam", wordKannada: "ಕಾಮ", transliteration: "Kām", transliterationHi: "काम" },
  { id: "bada", wordKannada: "ಬಡ಼ಾ", transliteration: "Baṛā", transliterationHi: "बड़ा" },
  { id: "chhota", wordKannada: "ಛೋಟಾ", transliteration: "Choṭā", transliterationHi: "छोटा" },
  { id: "accha", wordKannada: "ಅಚ್ಛಾ", transliteration: "Acchā", transliterationHi: "अच्छा" },
  { id: "bura", wordKannada: "ಬುರಾ", transliteration: "Burā", transliterationHi: "बुरा" },
  { id: "sundar", wordKannada: "ಸುಂದರ", transliteration: "Sundar", transliterationHi: "सुंदर" },
  { id: "tez", wordKannada: "ತೇಜ", transliteration: "Tez", transliterationHi: "तेज़" },
  { id: "dhima", wordKannada: "ಧೀಮಾ", transliteration: "Dhīmā", transliterationHi: "धीमा" },
  { id: "thanda", wordKannada: "ಠಂಡಾ", transliteration: "Ṭhanḍā", transliterationHi: "ठंडा" },
  { id: "garm", wordKannada: "ಗರ್ಮ", transliteration: "Garm", transliterationHi: "गरम" },
  { id: "meetha", wordKannada: "ಮೀಠಾ", transliteration: "Mīṭhā", transliterationHi: "मीठा" },
  { id: "khatta", wordKannada: "ಖಟ್ಟಾ", transliteration: "Khaṭṭā", transliterationHi: "खट्टा" },
  { id: "namkeen", wordKannada: "ನಮಕೀನ", transliteration: "Namakīn", transliterationHi: "नमकीन" },
  { id: "safed", wordKannada: "ಸಫೇದ", transliteration: "Safed", transliterationHi: "सफेद" },
  { id: "kala", wordKannada: "ಕಾಲಾ", transliteration: "Kālā", transliterationHi: "काला" },
  { id: "lal", wordKannada: "ಲಾಲ", transliteration: "Lāl", transliterationHi: "लाल" },
  { id: "nila", wordKannada: "ನೀಲಾ", transliteration: "Nīlā", transliterationHi: "नीला" },
  { id: "hara", wordKannada: "ಹರಾ", transliteration: "Harā", transliterationHi: "हरा" },
  { id: "pila", wordKannada: "ಪೀಲಾ", transliteration: "Pīlā", transliterationHi: "पीला" },
  { id: "kitabein", wordKannada: "ಕಿತಾಬೇಂ", transliteration: "Kitābeṅ", transliterationHi: "किताबें" },
  { id: "baccha", wordKannada: "ಬಚ್ಚಾ", transliteration: "Baccā", transliterationHi: "बच्चा" },
  { id: "ladki", wordKannada: "ಲಡ಼ಕೀ", transliteration: "Laṛkī", transliterationHi: "लड़की" },
  { id: "ladka", wordKannada: "ಲಡ಼ಕಾ", transliteration: "Laṛkā", transliterationHi: "लड़का" },
  { id: "chai", wordKannada: "ಚಾಯ", transliteration: "Chāy", transliterationHi: "चाय" },
  { id: "hotel", wordKannada: "ಹೋಟಲ", transliteration: "Hoṭel", transliterationHi: "होटल" },
  { id: "gaadi", wordKannada: "ಗಾಡ಼ೀ", transliteration: "Gāṛī", transliterationHi: "गाड़ी" },
  { id: "police", wordKannada: "ಪುಲಿಸ", transliteration: "Pulis", transliterationHi: "पुलिस" },
  { id: "gaon", wordKannada: "ಗಾಁವ", transliteration: "Gā̃v", transliterationHi: "गाँव" },
  { id: "shahar", wordKannada: "ಶಹರ", transliteration: "Shahar", transliterationHi: "शहर" },
  { id: "rajya", wordKannada: "ರಾಜ್ಯ", transliteration: "Rājya", transliterationHi: "राज्य" },
  { id: "naya", wordKannada: "ನಯಾ", transliteration: "Nayā", transliterationHi: "नया" },
  { id: "purana", wordKannada: "ಪುರಾನಾ", transliteration: "Purānā", transliterationHi: "पुराना" },
  { id: "ooncha", wordKannada: "ಊಁಚಾ", transliteration: "Ū̃chā", transliterationHi: "ऊँचा" },
  { id: "neecha", wordKannada: "ನೀಚಾ", transliteration: "Nīchā", transliterationHi: "नीचा" },
  { id: "sunhera", wordKannada: "ಸುನಹರಾ", transliteration: "Sunaherā", transliterationHi: "सुनहरा" },
  { id: "chamakdar", wordKannada: "ಚಮಕದಾರ", transliteration: "Chamakdār", transliterationHi: "चमकदार" },
  { id: "andhera", wordKannada: "ಅಂಧೇರಾ", transliteration: "Andherā", transliterationHi: "अंधेरा" },
  { id: "subah", wordKannada: "ಸುಬಹ", transliteration: "Subah", transliterationHi: "सुबह" },
  { id: "dopahar", wordKannada: "ದೋಪಹರ", transliteration: "Dopahar", transliterationHi: "दोपहर" },
  { id: "shaam", wordKannada: "ಶಾಮ", transliteration: "Shām", transliterationHi: "शाम" },
  { id: "minit", wordKannada: "ಮಿನಿಟ", transliteration: "Miniṭ", transliterationHi: "मिनिट" },
  { id: "ghanta", wordKannada: "ಘಂಟಾ", transliteration: "Ghanṭā", transliterationHi: "घंटा" },
  { id: "kal", wordKannada: "ಕಲ", transliteration: "Kal", transliterationHi: "कल" },
  { id: "aaj", wordKannada: "ಆಜ", transliteration: "Āj", transliterationHi: "आज" },
  { id: "hansna", wordKannada: "ಹಁಸನಾ", transliteration: "Hansnā", transliterationHi: "हँसना" },
  { id: "rona", wordKannada: "ರೋನಾ", transliteration: "Ronā", transliterationHi: "रोना" }
];

export const KAN_TO_HI = {
  'ಕ': 'क', 'ಖ': 'ख', 'ಗ': 'ग', 'ಘ': 'घ', 'ಙ': 'ङ',
  'ಚ': 'च', 'ಛ': 'छ', 'ಜ': 'ज', 'ಝ': 'झ', 'ಞ': 'ञ',
  'ಟ': 'ट', 'ಠ': 'ठ', 'ಡ': 'ड', 'ಢ': 'ढ', 'ಣ': 'ण',
  'ತ': 'त', 'ಥ': 'थ', 'ದ': 'द', 'ಧ': 'ध', 'ನ': 'न',
  'ಪ': 'प', 'ಫ': 'फ', 'ಬ': 'ब', 'ಭ': 'भ', 'ಮ': 'म',
  'ಯ': 'य', 'ರ': 'र', 'ಲ': 'ल', 'ವ': 'व', 'ಶ': 'श',
  'ಷ': 'ष', 'ಸ': 'स', 'ಹ': 'ह', 'ಳ': 'ळ', 'ಱ': 'ऱ',
  'ಅ': 'अ', 'ಆ': 'आ', 'ಇ': 'इ', 'ಈ': 'ई', 'ಉ': 'उ', 'ಊ': 'ऊ',
  'ಎ': 'ए', 'ಏ': 'ए', 'ಐ': 'ऐ', 'ಒ': 'ओ', 'ಓ': 'ओ', 'ಔ': 'औ', 'ಅಂ': 'ं', 'ಅಃ': 'ः',
  'ಋ': 'ऋ', 'ೠ': 'ॠ', 'ಌ': 'ऌ', 'ೡ': 'ॡ', 'ಁ': 'ँ'
};

export const KAN_MATRAS = {
  'ಾ': 'ा', // aa
  'ಿ': 'ि', // i
  'ೀ': 'ी', // ī
  'ು': 'ु', // u
  'ೂ': 'ू', // ū
  'ೃ': 'ृ', // r̥
  'ೄ': 'ॄ', // r̥̄
  'ೆ': 'े', // e
  'ೇ': 'े', // long e (Hindi matra is shared)
  'ೈ': 'ै', // ai
  'ೊ': 'ो', // o
  'ೋ': 'ो', // long o
  'ೌ': 'ौ', // au (combined sign)
  'ಂ': 'ं', // anusvara
  'ಃ': 'ः',  // visarga
  'ಁ': 'ँ'   // chandrabindu / anunasika
};

export const HI_TO_KAN = Object.entries(KAN_TO_HI).reduce((acc, [kn, hi]) => {
  if (!hi || acc[hi]) return acc;
  acc[hi] = kn;
  return acc;
}, {});

export const HI_MATRAS = Object.entries(KAN_MATRAS).reduce((acc, [kn, hi]) => {
  if (!hi || acc[hi]) return acc;
  acc[hi] = kn;
  return acc;
}, {});
