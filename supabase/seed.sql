-- Seed data: 20 reálných předmětů z Ostravské univerzity
-- Přírodovědecká fakulta — Katedra informatiky

INSERT INTO subjects (slug, name, short_tag, description, target_audience, real_requirements, difficulty, time_intensity, attendance_required, credits, semester, faculty, department, year) VALUES

-- 1. ročník
('uvod-do-programovani', 'Úvod do programování', 'UPR',
  'Základy algoritmizace a programování v jazyce Python. Proměnné, podmínky, cykly, funkce, základní datové struktury.',
  'Předmět pro úplné začátečníky bez předchozích znalostí programování. Vhodný pro první ročník.',
  'Pravidelná domácí cvičení (1–2 hodiny týdně). Zkouška formou praktického programování na počítači. Doporučeno procvičovat každý den alespoň 30 minut.',
  2, 3, true, 6, 'zimní', 'Přírodovědecká fakulta', 'Katedra informatiky', 1),

('matematika-1', 'Matematika 1', 'MA1',
  'Diferenciální a integrální počet funkcí jedné proměnné. Limity, derivace, integrály. Základy lineární algebry.',
  'Povinný předmět pro všechny studenty informatiky v 1. ročníku. Vyžaduje středoškolskou matematiku.',
  'Každý týden písemka z domácích úloh. Zkouška je těžká — spousta studentů opakuje. Začněte příklady řešit od prvního týdne.',
  5, 5, true, 8, 'zimní', 'Přírodovědecká fakulta', 'Katedra matematiky', 1),

('algoritmy-a-datove-struktury', 'Algoritmy a datové struktury', 'ADS',
  'Základní algoritmy (třídění, vyhledávání, grafy) a datové struktury (zásobník, fronta, strom, halda, hash tabulka).',
  'Pro studenty po absolvování Úvodu do programování. Vyžaduje základní znalost Pythonu nebo Javy.',
  'Programovací projekty každé 2 týdny. Zkouška kombinuje teorii (složitost algoritmů) a praxi (implementace). Doporučuji LeetCode pro procvičení.',
  4, 4, false, 6, 'letní', 'Přírodovědecká fakulta', 'Katedra informatiky', 1),

('logika-a-diskretni-matematika', 'Logika a diskrétní matematika', 'LDM',
  'Výroková a predikátová logika, teorie množin, relace a funkce, kombinatorika, teorie grafů.',
  'Předmět pro 1. ročník informatiky. Buduje matematický základ pro pokročilé předměty.',
  'Týdenní domácí úkoly. Zkouška je písemná — hodně příkladů na čas. Procvičujte důkazy matematickou indukcí.',
  4, 4, false, 6, 'zimní', 'Přírodovědecká fakulta', 'Katedra matematiky', 1),

-- 2. ročník
('databazove-systemy', 'Databázové systémy', 'DBS',
  'Relační databáze, SQL, normalizace, transakce, indexy. Úvod do NoSQL databází.',
  'Předmět pro 2. ročník. Prerekvizita: znalost základů programování.',
  'Semestrální projekt (návrh a implementace databáze). SQL zkouška — naučte se JOINy, agregace, poddotazy. Praktická část důležitější než teorie.',
  3, 3, false, 6, 'zimní', 'Přírodovědecká fakulta', 'Katedra informatiky', 2),

('operacni-systemy', 'Operační systémy', 'OS',
  'Procesy, vlákna, synchronizace, správa paměti, souborové systémy, plánování CPU.',
  'Pro 2. ročník se znalostí C/C++. Náročný předmět s důrazem na nízkoúrovňové programování.',
  'Laboratorní úlohy v C (syscalls, fork, semafory). Zkouška kombinuje teorii a debugging. Začněte lab úlohy brzy — jsou časově náročné.',
  4, 4, true, 6, 'letní', 'Přírodovědecká fakulta', 'Katedra informatiky', 2),

('pocitacove-site', 'Počítačové sítě', 'PSI',
  'Model TCP/IP, protokoly (HTTP, DNS, DHCP), směrování, bezpečnost sítí, základy Wiresharku.',
  'Pro 2. ročník. Vhodný i pro zájemce o kybernetickou bezpečnost.',
  'Laboratorní cvičení s Wiresharkem a packet analyzéry. Zkouška — hodně definic a schémat. Procvičte si subnetting.',
  3, 3, false, 5, 'zimní', 'Přírodovědecká fakulta', 'Katedra informatiky', 2),

('objektove-programovani', 'Objektově orientované programování', 'OOP',
  'OOP principy (zapouzdření, dědičnost, polymorfismus), návrhové vzory, Java/C++.',
  'Pro 2. ročník se základní znalostí programování.',
  'Semestrální projekt (aplikace v Javě). Zkouška testuje pochopení návrhových vzorů. Singleton, Factory, Observer — musíte znát.',
  3, 3, false, 6, 'zimní', 'Přírodovědecká fakulta', 'Katedra informatiky', 2),

-- 3. ročník
('softwarove-inzenyrstvi', 'Softwarové inženýrství', 'SWI',
  'Metodiky vývoje (Agile, Scrum, Waterfall), UML, testování, verzování, CI/CD.',
  'Pro 3. ročník. Zaměřeno na týmovou spolupráci a procesní přístupy.',
  'Týmový projekt (4–5 lidí, celý semestr). Prezentace u zkoušky. Klíčová je komunikace v týmu — vyberte si pečlivě partnery.',
  3, 4, true, 6, 'zimní', 'Přírodovědecká fakulta', 'Katedra informatiky', 3),

('umela-inteligence', 'Umělá inteligence', 'UI',
  'Prohledávání stavového prostoru, strojové učení, neuronové sítě, NLP, počítačové vidění.',
  'Pro 3. ročník se znalostí Pythonu a statistiky. Náročný ale fascinující.',
  'Python projekty (sklearn, PyTorch). Zkouška — teorie algoritmů a matematika (backpropagation). Jupyter notebooky jsou záchrana.',
  4, 4, false, 6, 'letní', 'Přírodovědecká fakulta', 'Katedra informatiky', 3),

('webove-technologie', 'Webové technologie', 'WT',
  'HTML5, CSS3, JavaScript, React, REST API, základy Node.js.',
  'Pro 2–3. ročník. Praktický předmět vhodný i pro samouky.',
  'Semestrální webová aplikace. Zkouška — CSS/JS otázky + předvedení projektu. Moderní JavaScript (ES6+) je nutnost.',
  3, 3, false, 5, 'letní', 'Přírodovědecká fakulta', 'Katedra informatiky', 2),

('pocitacova-grafika', 'Počítačová grafika', 'PG',
  'OpenGL, transformace, osvětlovací modely, textury, základy ray tracingu.',
  'Pro 3. ročník. Vyžaduje znalost lineární algebry a C++.',
  'OpenGL projekty — implementace shaderu, osvětlení. Matematika (matice, vektory) je klíčová. Bez lineární algebry je to peklo.',
  4, 4, false, 5, 'zimní', 'Přírodovědecká fakulta', 'Katedra informatiky', 3),

('bezpecnost-informacnich-systemu', 'Bezpečnost informačních systémů', 'BIS',
  'Kryptografie, síťová bezpečnost, etický hacking, OWASP Top 10, GDPR.',
  'Pro 3. ročník. Vhodný pro zájemce o kybernetickou bezpečnost.',
  'CTF challenges (Capture The Flag). Zkouška — teorie + praktický pentesting. Kali Linux je váš přítel.',
  3, 3, false, 5, 'letní', 'Přírodovědecká fakulta', 'Katedra informatiky', 3),

-- Bakalářské/magisterské
('distribuovane-systemy', 'Distribuované systémy', 'DS',
  'Architektura mikroslužeb, Docker, Kubernetes, messagin (Kafka), konzistence dat v distribuovaném prostředí.',
  'Pro 3. ročník+ nebo navazující magistr. Prerekvizita: OS, Počítačové sítě.',
  'Docker + Kubernetes projekt. Zkouška — CAP teorém, konzistencní modely. Praktické zkušenosti z cloudu výhodou.',
  4, 4, false, 6, 'letní', 'Přírodovědecká fakulta', 'Katedra informatiky', 3),

('kompilatory', 'Překladače', 'PJP',
  'Lexikální a syntaktická analýza, parsery, generování kódu, optimalizace.',
  'Pro 3. ročník. Vyžaduje znalost formálních jazyků a automatů.',
  'Implementace vlastního překladače (lexer + parser + codegen). Těžký ale jeden z nejzajímavějších předmětů. Začněte BRZY.',
  5, 5, false, 6, 'zimní', 'Přírodovědecká fakulta', 'Katedra informatiky', 3),

('pocitace-a-architektura', 'Počítače a architektura', 'PAR',
  'Von Neumannova architektura, instrukční sady, cache, pipeline, paralelní architektury.',
  'Pro 1–2. ročník. Základ pro pochopení, jak počítač skutečně funguje.',
  'Písemné zkoušky — spousta definic. Assembler úlohy. Pochopte pipeline a cache — to se hodí i v praxi.',
  3, 3, false, 5, 'letní', 'Přírodovědecká fakulta', 'Katedra informatiky', 1),

('matematika-2', 'Matematika 2', 'MA2',
  'Diferenciální rovnice, Laplaceova transformace, Fourierovy řady, funkce více proměnných.',
  'Pokračování Matematiky 1 pro 2. ročník. Ještě náročnější než MA1.',
  'Opět týdenní písemky. Zkouška je brutální — více než 50 % studentů opakuje. Cvičte každý den bez výjimky.',
  5, 5, true, 8, 'letní', 'Přírodovědecká fakulta', 'Katedra matematiky', 1),

('statistika', 'Statistika a pravděpodobnost', 'STA',
  'Pravděpodobnost, náhodné proměnné, statistické testy, regrese, teorie informace.',
  'Pro 2. ročník. Základ pro machine learning a datovou analýzu.',
  'R nebo Python projekty. Zkouška kombinuje výpočty a interpretaci. Bayes a hypotézové testování — klíčové.',
  3, 3, false, 5, 'zimní', 'Přírodovědecká fakulta', 'Katedra matematiky', 2),

('teorie-vypoctu', 'Teorie výpočtu', 'TVY',
  'Automaty, formální jazyky, Turingovy stroje, složitost výpočtu (P, NP, NP-úplnost).',
  'Pro 2–3. ročník. Velmi teoretický předmět — základ informatické teorie.',
  'Teoretické důkazy u zkoušky. Pochopte redukce a NP-úplnost — jsou u zkoušky vždy. Mnoho studentů podceňuje.',
  4, 3, false, 5, 'letní', 'Přírodovědecká fakulta', 'Katedra informatiky', 2),

('seminare-z-programovani', 'Seminář z programování', 'SEM',
  'Praktické programování, algoritmické soutěže, code review, profesionální programátorské návyky.',
  'Volitelný předmět pro všechny ročníky. Doporučeno pro všechny, kdo chtějí pracovat jako vývojáři.',
  'Žádná zkouška — zápočet za účast a odevzdané úlohy. Velmi příjemný předmět. Ideální pro portfoliové projekty.',
  2, 2, true, 2, 'oba', 'Přírodovědecká fakulta', 'Katedra informatiky', 1);
