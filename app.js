const STORAGE_KEY = 'raddningstjansten-signups-v1';
const REMOTE_STATE_ID = 'shared-v1';
const ADMIN_PASSWORD = 'Havsörn2026';
const ADMIN_SESSION_KEY = 'raddningstjansten-admin-authenticated';
const DEFAULT_PERSONNEL = [
  { id: 'p-40JJ', name: 'Joakim Jansson', station: '430 Alunda' },
  { id: 'p-43FW', name: 'Fredrik Wiklund', station: '430 Alunda' },
  { id: 'p-43NS', name: 'Nicklas Söderberg', station: '430 Alunda' },
  { id: 'p-43PG', name: 'Peter Gustafson', station: '430 Alunda' },
  { id: 'p-43PK', name: 'Patrik Jonsér', station: '430 Alunda' },
  { id: 'p-43TA', name: 'Torsten Andersson', station: '430 Alunda' },
  { id: 'p-4301', name: 'Victor Åkerlind', station: '430 Alunda' },
  { id: 'p-4302', name: 'Kristoffer Gullberg', station: '430 Alunda' },
  { id: 'p-4303', name: 'Anders Elm', station: '430 Alunda' },
  { id: 'p-4304', name: 'Stefan Karlsson', station: '430 Alunda' },
  { id: 'p-4305', name: 'Christoffer Andersson', station: '430 Alunda' },
  { id: 'p-4306', name: 'Marcus Lundgren', station: '430 Alunda' },
  { id: 'p-4307', name: 'Samuel Ejerfeldt', station: '430 Alunda' },
  { id: 'p-4308', name: 'Andreas Breidenskog', station: '430 Alunda' },
  { id: 'p-4309', name: 'Jimmy Forsman', station: '430 Alunda' },
  { id: 'p-4310', name: 'Tim Widell', station: '430 Alunda' },
  { id: 'p-4311', name: 'Stefan Hansson', station: '430 Alunda' },
  { id: 'p-4312', name: 'Patric Redander', station: '430 Alunda' },
  { id: 'p-4314', name: 'Marcus Thilander', station: '430 Alunda' },
  { id: 'p-4315', name: 'Silas Engström', station: '430 Alunda' },
  { id: 'p-4317', name: 'Jonathan Thyrén', station: '430 Alunda' },
  { id: 'p-4318', name: 'Fia Cranz', station: '430 Alunda' },
  { id: 'p-4319', name: 'Jonathan Bohman', station: '430 Alunda' },
  { id: 'p-4320', name: 'Albert Andersson', station: '430 Alunda' },
  { id: 'p-4321', name: 'Gabriel Eriksson', station: '430 Alunda' },
  { id: 'p-1424', name: 'Wiebrn Boonstra', station: '140 Skyttorp' },
  { id: 'p-1428', name: 'Mattias Carlsson', station: '140 Skyttorp' },
  { id: 'p-14PC', name: 'Patric Carlsson', station: '140 Skyttorp' },
  { id: 'p-14LC', name: 'Lukasz Choroszucha', station: '140 Skyttorp' },
  { id: 'p-1437', name: 'Eric Hokke', station: '140 Skyttorp' },
  { id: 'p-14NI', name: 'Niclas Ignell', station: '140 Skyttorp' },
  { id: 'p-14JL', name: 'Jesper Lembie', station: '140 Skyttorp' },
  { id: 'p-1429', name: 'Ken Lembie', station: '140 Skyttorp' },
  { id: 'p-14SL', name: 'Sara Lif', station: '140 Skyttorp' },
  { id: 'p-1427', name: 'Tomas Nyström', station: '140 Skyttorp' },
  { id: 'p-1430', name: 'Felix Solum', station: '140 Skyttorp' },
  { id: 'p-14GS', name: 'Göran Svensson', station: '140 Skyttorp' },
  { id: 'p-14JÖ', name: 'Jörgen Svensson', station: '140 Skyttorp' },
  { id: 'p-1425', name: 'Urban Wall', station: '140 Skyttorp' },
  { id: 'p-15CB', name: 'Christoffer Berglund', station: '150 Knutby' },
  { id: 'p-15KB', name: 'Karin Berglund', station: '150 Knutby' },
  { id: 'p-1559', name: 'Torbjörn Berglund', station: '150 Knutby' },
  { id: 'p-1555', name: 'Örjan Carlborg', station: '150 Knutby' },
  { id: 'p-1551', name: 'Jonas Honkanen', station: '150 Knutby' },
  { id: 'p-1554', name: 'Lars Jansson', station: '150 Knutby' },
  { id: 'p-15RJ', name: 'Rikard Johansson', station: '150 Knutby' },
  { id: 'p-1561', name: 'Tobias Johansson', station: '150 Knutby' },
  { id: 'p-1552', name: 'Emil Jonsson', station: '150 Knutby' },
  { id: 'p-15PK', name: 'Peter Karlsson', station: '150 Knutby' },
  { id: 'p-15ML', name: 'Mathias Lejholm', station: '150 Knutby' },
  { id: 'p-1556', name: 'Petter Palmius', station: '150 Knutby' },
  { id: 'p-1604', name: 'Isla Talviharju', station: '150 Knutby' },
  { id: 'p-15FW', name: 'Fredrik Wincent', station: '150 Knutby' },
  { id: 'p-1550', name: 'Robin Wincent', station: '150 Knutby' },
  { id: 'p-1558', name: 'Magnus Åhström', station: '150 Knutby' },
  { id: 'p-16SA', name: 'Sture Ahlström', station: '160 Almunge' },
  { id: 'p-16JA', name: 'Johan Alm', station: '160 Almunge' },
  { id: 'p-1613', name: 'William Alm', station: '160 Almunge' },
  { id: 'p-16PA', name: 'Petter Andersson', station: '160 Almunge' },
  { id: 'p-1610', name: 'Johnny Arctaedius', station: '160 Almunge' },
  { id: 'p-16MB', name: 'Mikael Berggren', station: '160 Almunge' },
  { id: 'p-1616', name: 'Olivia Dahmén', station: '160 Almunge' },
  { id: 'p-1615', name: 'Andreas Deborg', station: '160 Almunge' },
  { id: 'p-1608', name: 'William Ehrenroth', station: '160 Almunge' },
  { id: 'p-16ET', name: 'Roger Ejderfelt', station: '160 Almunge' },
  { id: 'p-1603', name: 'Carl Marcus Ericsson', station: '160 Almunge' },
  { id: 'p-1612', name: 'Christopher Graham', station: '160 Almunge' },
  { id: 'p-1623', name: 'Per Grahn', station: '160 Almunge' },
  { id: 'p-16KH', name: 'Kurt Holm', station: '160 Almunge' },
  { id: 'p-16JJ', name: 'Johan Jansson', station: '160 Almunge' },
  { id: 'p-16SJ', name: 'Stefan Jansson', station: '160 Almunge' },
  { id: 'p-1601', name: 'Ludwig Lindberg', station: '160 Almunge' },
  { id: 'p-1609', name: 'Jessica Lindell', station: '160 Almunge' },
  { id: 'p-1614', name: 'Olof Nygren', station: '160 Almunge' },
  { id: 'p-1602', name: 'Mikael Svensson', station: '160 Almunge' },
  { id: 'p-1604-160', name: 'Isla Talviharju', station: '160 Almunge' },
  { id: 'p-17MN', name: 'Micael Albertson', station: '170 Storvreta' },
  { id: 'p-1703', name: 'Marcus Billing', station: '170 Storvreta' },
  { id: 'p-1702', name: 'Johan Bondesson', station: '170 Storvreta' },
  { id: 'p-1706', name: 'Tommie Burestad', station: '170 Storvreta' },
  { id: 'p-1715', name: 'Jenny Edlund Nummelin', station: '170 Storvreta' },
  { id: 'p-1710', name: 'Isaac Edwards', station: '170 Storvreta' },
  { id: 'p-17BN', name: 'Bengt Eriksson', station: '170 Storvreta' },
  { id: 'p-1722', name: 'Samuel Green', station: '170 Storvreta' },
  { id: 'p-1713', name: 'Anders Holm', station: '170 Storvreta' },
  { id: 'p-17TJ', name: 'Tobias Jansson', station: '170 Storvreta' },
  { id: 'p-1705', name: 'Anders Köhler', station: '170 Storvreta' },
  { id: 'p-1718', name: 'Samuel Larsson', station: '170 Storvreta' },
  { id: 'p-1716', name: 'Henrik Lundberg', station: '170 Storvreta' },
  { id: 'p-17EM', name: 'Erik Molin', station: '170 Storvreta' },
  { id: 'p-17AN', name: 'Andreas Nord', station: '170 Storvreta' },
  { id: 'p-1714', name: 'Ronny Nordlund', station: '170 Storvreta' },
  { id: 'p-1712', name: 'William Pettersson', station: '170 Storvreta' },
  { id: 'p-1719', name: 'Thomas Regnell', station: '170 Storvreta' },
  { id: 'p-1728', name: 'Daniel Sandberg', station: '170 Storvreta' },
  { id: 'p-17JS', name: 'Jörgen Saxborg', station: '170 Storvreta' },
  { id: 'p-1709', name: 'Mikael Söderberg', station: '170 Storvreta' },
  { id: 'p-1729', name: 'Kim Thorsell', station: '170 Storvreta' },
  { id: 'p-1701', name: 'Marcus Torstensson', station: '170 Storvreta' },
  { id: 'p-17TÄ', name: 'Jan Täcktör', station: '170 Storvreta' },
  { id: 'p-17BV', name: 'Björn Vällfors', station: '170 Storvreta' },
  { id: 'p-17FÅ', name: 'Fredrik Åkerfeldt', station: '170 Storvreta' },
  { id: 'p-18TH', name: 'Tove Hagström', station: '180 Järlåsa' },
  { id: 'p-1866', name: 'Mats Jansson', station: '180 Järlåsa' },
  { id: 'p-18JK', name: 'Jimmy Karelius', station: '180 Järlåsa' },
  { id: 'p-1429-180', name: 'Ken Lembie', station: '180 Järlåsa' },
  { id: 'p-1853', name: 'Martin Litheli', station: '180 Järlåsa' },
  { id: 'p-1859', name: 'Fredrik Persson', station: '180 Järlåsa' },
  { id: 'p-18MP', name: 'Magnus Persson', station: '180 Järlåsa' },
  { id: 'p-18TP', name: 'Tomas Propst', station: '180 Järlåsa' },
  { id: 'p-18US', name: 'Ulrik Sommar', station: '180 Järlåsa' },
  { id: 'p-1855', name: 'Thomas Stråle', station: '180 Järlåsa' },
  { id: 'p-1856', name: 'Carolina Sydén', station: '180 Järlåsa' },
  { id: 'p-1867', name: 'Thomas Söderlund', station: '180 Järlåsa' },
  { id: 'p-1871', name: 'Maja Algstrand', station: '180 Järlåsa' },
  { id: 'p-1854', name: 'Oskar Daniels', station: '180 Järlåsa' },
  { id: 'p-1850', name: 'Magnus Eklund', station: '180 Järlåsa' },
  { id: 'p-1857', name: 'Joel Elofsson', station: '180 Järlåsa' },
  { id: 'p-1910', name: 'Brian Klemme', station: '190 Björklinge' },
  { id: 'p-066', name: 'Fredrik Lundin', station: '190 Björklinge' },
  { id: 'p-1915', name: 'Isabel Mandahl Malm', station: '190 Björklinge' },
  { id: 'p-1908', name: 'Oscar Sahlberg', station: '190 Björklinge' },
  { id: 'p-1911', name: 'Maria Svedin', station: '190 Björklinge' },
  { id: 'p-14GS-190', name: 'Göran Svensson', station: '190 Björklinge' },
  { id: 'p-1916', name: 'Henrik Tomenius', station: '190 Björklinge' },
  { id: 'p-1903', name: 'Kim Tynell Ågren', station: '190 Björklinge' },
  { id: 'p-1926', name: 'Tobias Wester', station: '190 Björklinge' },
  { id: 'p-19SÅ', name: 'Sara Åkerfelt', station: '190 Björklinge' },
  { id: 'p-1902', name: 'Sebastian Öhman', station: '190 Björklinge' },
  { id: 'p-1912', name: 'Markus Emet', station: '190 Björklinge' },
  { id: 'p-1920', name: 'Anton Gunnarsson', station: '190 Björklinge' },
  { id: 'p-19HR', name: 'Robert Holmberg', station: '190 Björklinge' },
  { id: 'p-19RH', name: 'Robert Hovberg', station: '190 Björklinge' },
  { id: 'p-1924', name: 'Ian Isaacs', station: '190 Björklinge' },
  { id: 'p-MJ', name: 'Mikael Jeppsson', station: '190 Björklinge' },
  { id: 'p-1917', name: 'Rasmus Jonasson', station: '190 Björklinge' },
  { id: 'p-1904', name: 'Patrik Jungmarker', station: '190 Björklinge' },
  { id: 'p-1919', name: 'Mikael Karlsson', station: '190 Björklinge' },
  { id: 'p-1909', name: 'Uno Karlsson', station: '190 Björklinge' },
  { id: 'p-1921', name: 'Per Kihlén', station: '190 Björklinge' },
  { id: 'p-41BA', name: 'Benny Andersson', station: '410 Öregrund' },
  { id: 'p-41OB', name: 'Oskar Bergström', station: '410 Öregrund' },
  { id: 'p-41DB', name: 'Daniel Brundin', station: '410 Öregrund' },
  { id: 'p-41BD', name: 'Björn Danielsson', station: '410 Öregrund' },
  { id: 'p-4123', name: 'Martin Eriksson', station: '410 Öregrund' },
  { id: 'p-4122', name: 'Tony Herre', station: '410 Öregrund' },
  { id: 'p-4129', name: 'Fredrik Jansson', station: '410 Öregrund' },
  { id: 'p-41FL', name: 'Fredrik Lovén', station: '410 Öregrund' },
  { id: 'p-4125', name: 'Conny Rehn', station: '410 Öregrund' },
  { id: 'p-41KS', name: 'Kim Sundberg', station: '410 Öregrund' },
  { id: 'p-4127', name: 'Magnus Söderquist', station: '410 Öregrund' },
  { id: 'p-42EN', name: 'Emil Norling', station: '420 Österbybruk' },
  { id: 'p-4205', name: 'Kevin Nyberg', station: '420 Österbybruk' },
  { id: 'p-42RO', name: 'Robert Nyberg', station: '420 Österbybruk' },
  { id: 'p-4208', name: 'Daniel Pettersson', station: '420 Österbybruk' },
  { id: 'p-42MR', name: 'Mikael Rosenhoff', station: '420 Österbybruk' },
  { id: 'p-4210', name: 'Morgan Stork', station: '420 Österbybruk' },
  { id: 'p-4213', name: 'John Wallén Lannergren', station: '420 Österbybruk' },
  { id: 'p-4211', name: 'Niclas Wennbom', station: '420 Österbybruk' },
  { id: 'p-4204', name: 'Carolin Vestberg', station: '420 Österbybruk' },
  { id: 'p-4207', name: 'Charlie Westerberg', station: '420 Österbybruk' },
  { id: 'p-4209', name: 'Erika Åsberg', station: '420 Österbybruk' },
  { id: 'p-42PÅ', name: 'Per Åsberg', station: '420 Österbybruk' },
  { id: 'p-4219', name: 'Lukas Andersen', station: '420 Österbybruk' },
  { id: 'p-4201', name: 'Guy Andersson', station: '420 Österbybruk' },
  { id: 'p-4220', name: 'Frida Dubois', station: '420 Österbybruk' },
  { id: 'p-4214', name: 'Stefan Forsberg', station: '420 Österbybruk' },
  { id: 'p-4222', name: 'Sandra Frisk', station: '420 Österbybruk' },
  { id: 'p-4203', name: 'Sebastian Harbom', station: '420 Österbybruk' },
  { id: 'p-4218', name: 'Tove Höglund', station: '420 Österbybruk' },
  { id: 'p-42EK', name: 'Emil Karlsson', station: '420 Österbybruk' },
  { id: 'p-4202', name: 'Benjamin Lundqvist', station: '420 Österbybruk' },
  { id: 'p-4221', name: 'Johan Mac Queen', station: '420 Österbybruk' },
  { id: 'p-4215', name: 'Linus Niklasson', station: '420 Österbybruk' },
  { id: 'p-42JN', name: 'John Norell', station: '420 Österbybruk' },
  { id: 'p-4425', name: 'Victor Eriksson', station: '440 Gimo' },
  { id: 'p-4421', name: 'Erik Florén', station: '440 Gimo' },
  { id: 'p-4432', name: 'Filip Karlsson', station: '440 Gimo' },
  { id: 'p-4441', name: 'Mikael Lind', station: '440 Gimo' },
  { id: 'p-44BM', name: 'Björn Mattsson', station: '440 Gimo' },
  { id: 'p-44PN', name: 'Per Norlin', station: '440 Gimo' },
  { id: 'p-44KP', name: 'Christer Philipsson', station: '440 Gimo' },
  { id: 'p-42MR-440', name: 'Mikael Rosenhoff', station: '440 Gimo' },
  { id: 'p-4433', name: 'Louise Sahlén', station: '440 Gimo' },
  { id: 'p-4430', name: 'David Wallström', station: '440 Gimo' },
  { id: 'p-4211-440', name: 'Niclas Wennbom', station: '440 Gimo' },
  { id: 'p-44LÅ', name: 'Lars Åhman', station: '440 Gimo' },
  { id: 'p-4422', name: 'Niclas Ahlbom', station: '440 Gimo' },
  { id: 'p-4434', name: 'Daniel Andersson', station: '440 Gimo' },
  { id: 'p-44MA', name: 'Mikael Andréasson', station: '440 Gimo' },
  { id: 'p-4426', name: 'Sebastian Björk', station: '440 Gimo' },
  { id: 'p-4424', name: 'Robin Björn', station: '440 Gimo' },
  { id: 'p-4436', name: 'Robert Ek', station: '440 Gimo' },
  { id: 'p-44AE', name: 'Anders Eriksson', station: '440 Gimo' },
  { id: 'p-4431', name: 'Anton Eriksson', station: '440 Gimo' },
  { id: 'p-5119', name: 'Andreas Larsson', station: '500 Tierp' },
  { id: 'p-5117', name: 'Omar Mardenlli', station: '500 Tierp' },
  { id: 'p-5105', name: 'Omar Mardenly', station: '500 Tierp' },
  { id: 'p-5118', name: 'Anton Norling', station: '500 Tierp' },
  { id: 'p-5110', name: 'John Norling', station: '500 Tierp' },
  { id: 'p-51JP', name: 'Jan-Olof Pettersson', station: '500 Tierp' },
  { id: 'p-5114', name: 'Joel Pettersson', station: '500 Tierp' },
  { id: 'p-5111', name: 'Sandra Stålberg', station: '500 Tierp' },
  { id: 'p-5107', name: 'Krister Svedlund', station: '500 Tierp' },
  { id: 'p-5115', name: 'Mathias Trässman', station: '500 Tierp' },
  { id: 'p-5113', name: 'Kim Wallin', station: '500 Tierp' },
  { id: 'p-5112', name: 'Stefan Westerbom', station: '500 Tierp' },
  { id: 'p-5116', name: 'Marina Blom', station: '500 Tierp' },
  { id: 'p-5101', name: 'Andreas Carlsson', station: '500 Tierp' },
  { id: 'p-5104', name: 'Mats Dahlberg', station: '500 Tierp' },
  { id: 'p-51RD', name: 'Robin Dahlberg', station: '500 Tierp' },
  { id: 'p-5106', name: 'Fredrik Gidebo', station: '500 Tierp' },
  { id: 'p-5102', name: 'Christopher Hellerstedt', station: '500 Tierp' },
  { id: 'p-5103', name: 'Staffan Jansson', station: '500 Tierp' },
  { id: 'p-51AK', name: 'Andreas Karlberg', station: '500 Tierp' },
  { id: 'p-5416', name: 'Linus Jansson', station: '540 Söderfors' },
  { id: 'p-5418', name: 'Jesper Jonsson', station: '540 Söderfors' },
  { id: 'p-5421', name: 'Marcus Juneholt', station: '540 Söderfors' },
  { id: 'p-51AK-540', name: 'Andreas Karlberg', station: '540 Söderfors' },
  { id: 'p-5404', name: 'Johan Olsson', station: '540 Söderfors' },
  { id: 'p-5413', name: 'Pontus Söderberg', station: '540 Söderfors' },
  { id: 'p-5414', name: 'Andreas Sörensen', station: '540 Söderfors' },
  { id: 'p-5406', name: 'Willy Wendel', station: '540 Söderfors' },
  { id: 'p-5410', name: 'Martin Wåhlén', station: '540 Söderfors' },
  { id: 'p-54PW', name: 'Per Wåhlén', station: '540 Söderfors' },
  { id: 'p-5403', name: 'Fredrik Årne', station: '540 Söderfors' },
  { id: 'p-5419', name: 'Sebastian Östlin', station: '540 Söderfors' },
  { id: 'p-5409', name: 'Patrik Bergman', station: '540 Söderfors' },
  { id: 'p-540C', name: 'Ola Cedvall', station: '540 Söderfors' },
  { id: 'p-5401', name: 'Sebastian Chiriac', station: '540 Söderfors' },
  { id: 'p-5412', name: 'Liam Ellström', station: '540 Söderfors' },
  { id: 'p-54TE', name: 'Tomas Ellström', station: '540 Söderfors' },
  { id: 'p-5420', name: 'Joakim Eriksson', station: '540 Söderfors' },
  { id: 'p-54JE', name: 'Jonas Eshammar', station: '540 Söderfors' },
  { id: 'p-54MG', name: 'Mikael Gustafsson', station: '540 Söderfors' },
  { id: 'p-5417', name: 'Simon Haug Mattsson', station: '540 Söderfors' },
  { id: 'p-55AS', name: 'Sven Almlöf', station: '550 Skärplinge' },
  { id: 'p-5507', name: 'Jörgen Andersson', station: '550 Skärplinge' },
  { id: 'p-5503', name: 'Karl Andersson', station: '550 Skärplinge' },
  { id: 'p-5502', name: 'Tommy Andersson', station: '550 Skärplinge' },
  { id: 'p-55MA', name: 'Manne Arulf', station: '550 Skärplinge' },
  { id: 'p-5510', name: 'Johan Boussard', station: '550 Skärplinge' },
  { id: 'p-5506', name: 'Jonas Carlsson', station: '550 Skärplinge' },
  { id: 'p-55MC', name: 'Mikael Carlsson', station: '550 Skärplinge' },
  { id: 'p-55ME', name: 'Mattias Eriksson', station: '550 Skärplinge' },
  { id: 'p-5504', name: 'Jonny Helmefors', station: '550 Skärplinge' },
  { id: 'p-5508', name: 'Jesper Löfgren', station: '550 Skärplinge' },
  { id: 'p-5505', name: 'Jani Rautio', station: '550 Skärplinge' },
  { id: 'p-5509', name: 'Mathias Stålberg', station: '550 Skärplinge' }
];
const DEFAULT_STATIONS = [
  '110 Fyrislund',
  '140 Skyttorp',
  '150 Knutby',
  '160 Almunge',
  '170 Storvreta',
  '180 Järlåsa',
  '190 Björklinge',
  '400 Östhammar',
  '410 Öregrund',
  '420 Österbybruk',
  '430 Alunda',
  '440 Gimo',
  '500 Tierp',
  '540 Söderfors',
  '550 Skärplinge'
];
const LEGACY_STATIONS = [
  'Almunge',
  'Jarlasa',
  'Skarplinge',
  'Storvreta',
  'Osthammar',
  'Osterbybruk',
  'Knutby',
  'Alunda',
  '1800',
  '5100',
  '5400',
  '5500'
];
const LEGACY_STATIONS_ASCII = [
  '140 Skyttorp',
  '150 Knutby',
  '160 Almunge',
  '170 Storvreta',
  '180 Jarlasa',
  '190 Bjorklinge',
  '400 Osthammar',
  '410 Oregrund',
  '420 Osterbybruk',
  '430 Alunda',
  '440 Gimo',
  '500 Tierp',
  '540 Soderfors',
  '550 Skarplinge'
];

const page = document.body.dataset.page;
const state = loadState();
const appConfig = window.APP_CONFIG || {};

let remoteSyncInFlight = false;
let remoteSyncPending = false;
let lastRemoteUpdatedAt = null;
let remotePollTimer = null;

const runtime = {
  calendarYear: new Date().getFullYear(),
  calendarMonth: new Date().getMonth(),
  selectedDates: new Map(),
  signupContext: null,
  editingEventId: null
};

bootstrap();

async function bootstrap() {
  await initializeSharedPersistence();
  bindRefreshButton();

  if (page === 'admin') {
    if (!ensureAdminAccess()) return;
    initAdminPage();
  }

  if (page === 'public') {
    initPublicPage();
  }

  startRemotePolling();
}

function isAdminAuthenticated() {
  return localStorage.getItem(ADMIN_SESSION_KEY) === '1';
}

function setAdminAuthenticated(isAuthenticated) {
  if (isAuthenticated) {
    localStorage.setItem(ADMIN_SESSION_KEY, '1');
    return;
  }
  localStorage.removeItem(ADMIN_SESSION_KEY);
}

function requestAdminAuthentication() {
  if (isAdminAuthenticated()) return true;

  const entered = window.prompt('Ange lösenord för adminläge:');
  if (entered === null) return false;
  if (entered.trim() !== ADMIN_PASSWORD) {
    window.alert('Fel lösenord.');
    return false;
  }

  setAdminAuthenticated(true);
  return true;
}

function ensureAdminAccess() {
  if (requestAdminAuthentication()) return true;
  window.location.href = 'index.html';
  return false;
}

function getFallbackState() {
  return {
    stations: [...DEFAULT_STATIONS],
    events: [],
    organizerName: '',
    organizerEmail: '',
    personnel: [...DEFAULT_PERSONNEL]
  };
}

function normalizeStatePayload(payload) {
  const fallback = getFallbackState();
  const parsed = payload && typeof payload === 'object' ? payload : fallback;

  const savedStations = Array.isArray(parsed.stations) && parsed.stations.length
    ? parsed.stations
    : [...DEFAULT_STATIONS];
  const migratedStations = shouldMigrateStations(savedStations)
    ? [...DEFAULT_STATIONS]
    : mergeStations(savedStations, DEFAULT_STATIONS);
  const savedPersonnel = Array.isArray(parsed.personnel) ? parsed.personnel : [];

  return {
    stations: migratedStations,
    events: normalizeEvents(Array.isArray(parsed.events) ? parsed.events : []),
    organizerName: typeof parsed.organizerName === 'string' ? parsed.organizerName : '',
    organizerEmail: typeof parsed.organizerEmail === 'string' ? parsed.organizerEmail : '',
    personnel: mergePersonnel(savedPersonnel, DEFAULT_PERSONNEL)
  };
}

function normalizeEvents(events) {
  return events
    .filter((event) => event && typeof event === 'object')
    .map((event) => ({
      ...event,
      eventComment: typeof event.eventComment === 'string' ? event.eventComment : '',
      eventTags: Array.isArray(event.eventTags) ? event.eventTags : []
    }));
}

function loadState() {
  const fallback = getFallbackState();

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return normalizeStatePayload(parsed);
  } catch {
    return fallback;
  }
}

function shouldMigrateStations(stations) {
  return arraysEqual(stations, LEGACY_STATIONS) || arraysEqual(stations, LEGACY_STATIONS_ASCII);
}

function mergeStations(savedStations, defaultStations) {
  const merged = [...savedStations];
  defaultStations.forEach((station) => {
    if (!merged.includes(station)) {
      merged.push(station);
    }
  });
  return merged;
}

function mergePersonnel(savedPersonnel, defaultPersonnel) {
  const merged = [];
  const seen = new Set();

  [...savedPersonnel, ...defaultPersonnel].forEach((entry) => {
    if (!entry || typeof entry !== 'object') return;

    const name = typeof entry.name === 'string' ? entry.name.trim() : '';
    const station = typeof entry.station === 'string' ? entry.station.trim() : '';
    if (!name || !station) return;

    const key = `${station.toLowerCase()}|${name.toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);

    merged.push({
      id: typeof entry.id === 'string' && entry.id ? entry.id : createId(),
      name,
      station
    });
  });

  return merged;
}

function arraysEqual(left, right) {
  if (left.length !== right.length) return false;
  return left.every((value, index) => value === right[index]);
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  queueRemoteSync();
}

function hasRemoteConfig() {
  return !!(appConfig.supabaseUrl && appConfig.supabaseAnonKey);
}

function isRemoteEnabled() {
  return hasRemoteConfig();
}

async function supabaseRequest(pathWithQuery, options = {}) {
  if (!isRemoteEnabled()) {
    return { ok: false, status: 0, error: 'Remote config missing' };
  }

  const headers = Object.assign({
    apikey: appConfig.supabaseAnonKey,
    Authorization: `Bearer ${appConfig.supabaseAnonKey}`
  }, options.headers || {});

  const response = await fetch(`${appConfig.supabaseUrl}/rest/v1/${pathWithQuery}`, {
    method: options.method || 'GET',
    headers,
    body: options.body
  });

  if (!response.ok) {
    let details = '';
    try {
      details = await response.text();
    } catch {
      details = '';
    }
    return { ok: false, status: response.status, error: details || response.statusText };
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return { ok: true, status: response.status, data: await response.json() };
  }
  return { ok: true, status: response.status, data: null };
}

async function initializeSharedPersistence() {
  if (!isRemoteEnabled()) return;

  try {
    const data = await pullStateFromRemote();
    if (data && data.payload) return;

    if (hasMeaningfulLocalData()) {
      await pushStateToRemote();
    }
  } catch (error) {
    console.error('Shared state initialization failed.', error);
  }
}

async function pullStateFromRemote() {
  const result = await supabaseRequest(`app_state?select=payload,updated_at&id=eq.${encodeURIComponent(REMOTE_STATE_ID)}`);
  if (!result.ok) {
    console.error('Could not read shared state from Supabase.', result.error);
    return null;
  }

  const rows = Array.isArray(result.data) ? result.data : [];
  const data = rows.length ? rows[0] : null;

  if (data && data.payload) {
    Object.assign(state, normalizeStatePayload(data.payload));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    lastRemoteUpdatedAt = data.updated_at || null;
  }

  return data;
}

function queueRemoteSync() {
  if (!isRemoteEnabled()) return;
  if (remoteSyncInFlight) {
    remoteSyncPending = true;
    return;
  }
  remoteSyncInFlight = true;
  void pushStateToRemote().finally(() => {
    remoteSyncInFlight = false;
    if (remoteSyncPending) {
      remoteSyncPending = false;
      queueRemoteSync();
    }
  });
}

async function pushStateToRemote() {
  if (!isRemoteEnabled()) return;

  const timestamp = new Date().toISOString();

  const result = await supabaseRequest('app_state?on_conflict=id', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal'
    },
    body: JSON.stringify([{
      id: REMOTE_STATE_ID,
      payload: state,
      updated_at: timestamp
    }])
  });

  if (!result.ok) {
    console.error('Could not sync shared state to Supabase.', result.error);
    return;
  }

  lastRemoteUpdatedAt = timestamp;
}

function startRemotePolling() {
  if (!isRemoteEnabled() || remotePollTimer) return;

  remotePollTimer = window.setInterval(async () => {
    if (remoteSyncInFlight) return;
    if (page === 'admin' && runtime.editingEventId) return;

    try {
      const result = await supabaseRequest(`app_state?select=updated_at&id=eq.${encodeURIComponent(REMOTE_STATE_ID)}`);
      if (!result.ok || !Array.isArray(result.data) || !result.data.length) return;

      const data = result.data[0];
      if (!data || !data.updated_at) return;

      if (isRemoteTimestampNewer(data.updated_at, lastRemoteUpdatedAt)) {
        window.location.reload();
      }
    } catch {
      // Ignore polling errors and keep local app usable.
    }
  }, 8000);
}

function isRemoteTimestampNewer(left, right) {
  if (!left) return false;
  if (!right) return true;
  const leftMs = Date.parse(left);
  const rightMs = Date.parse(right);
  if (Number.isNaN(leftMs) || Number.isNaN(rightMs)) {
    return left !== right;
  }
  return leftMs > rightMs;
}

function bindRefreshButton() {
  const refreshButton = document.getElementById('btn-refresh-data');
  if (!refreshButton) return;

  refreshButton.addEventListener('click', async () => {
    refreshButton.disabled = true;
    const previousLabel = refreshButton.textContent;
    refreshButton.textContent = 'Hämtar...';

    try {
      if (!isRemoteEnabled()) {
        const reasons = [];
        if (!appConfig.supabaseUrl) reasons.push('supabaseUrl saknas');
        if (!appConfig.supabaseAnonKey) reasons.push('supabaseAnonKey saknas');
        const detail = reasons.length ? `\n\nOrsak: ${reasons.join(', ')}` : '';
        window.alert(`Supabase är inte aktivt ännu.${detail}`);
        return;
      }

      const data = await pullStateFromRemote();
      if (!data || !data.payload) {
        window.alert('Ingen delad data hittades i databasen ännu.');
        return;
      }

      window.location.reload();
    } finally {
      refreshButton.disabled = false;
      refreshButton.textContent = previousLabel;
    }
  });
}

function initAdminPage() {
  const calendarTitle = document.getElementById('calendar-title');

  document.getElementById('btn-prev-month').addEventListener('click', () => {
    runtime.calendarMonth -= 1;
    if (runtime.calendarMonth < 0) {
      runtime.calendarMonth = 11;
      runtime.calendarYear -= 1;
    }
    renderCalendar();
  });

  document.getElementById('btn-next-month').addEventListener('click', () => {
    runtime.calendarMonth += 1;
    if (runtime.calendarMonth > 11) {
      runtime.calendarMonth = 0;
      runtime.calendarYear += 1;
    }
    renderCalendar();
  });

  document.getElementById('btn-create-event').addEventListener('click', createEvent);
  document.getElementById('btn-cancel-edit').addEventListener('click', clearEventForm);
  document.getElementById('btn-reset').addEventListener('click', resetAllData);

  const organizerNameInput = document.getElementById('organizer-name');
  const organizerEmailInput = document.getElementById('organizer-email');
  if (organizerNameInput) {
    organizerNameInput.value = '';
  }
  if (organizerEmailInput) {
    organizerEmailInput.value = '';
  }

  renderCalendar();
  renderSelectedDates();
  renderAdminEvents();
  initPersonnelSection();

  function initPersonnelSection() {
    const stationSel = document.getElementById('personnel-station');
    const filterSel = document.getElementById('personnel-filter-station');
    const nameInput = document.getElementById('personnel-name');
    const addBtn = document.getElementById('btn-add-personnel');
    if (!stationSel || !filterSel || !nameInput || !addBtn) return;

    stationSel.innerHTML = buildStationOptions('', false);
    filterSel.innerHTML = `<option value="">Välj station...</option>${buildStationOptions('', false)}`;
    filterSel.addEventListener('change', renderPersonnelList);

    addBtn.addEventListener('click', () => {
      const name = nameInput.value.trim();
      const station = stationSel.value;
      if (!name || !station) {
        window.alert('Fyll i namn och station.');
        return;
      }
      if ((state.personnel || []).some((p) => p.name.toLowerCase() === name.toLowerCase() && p.station === station)) {
        window.alert('Den personen finns redan p\u00e5 den stationen.');
        return;
      }
      if (!state.personnel) state.personnel = [];
      state.personnel.push({ id: createId(), name, station });
      state.personnel.sort((a, b) => a.station.localeCompare(b.station, 'sv') || a.name.localeCompare(b.name, 'sv'));
      saveState();
      nameInput.value = '';
      if (!filterSel.value) {
        filterSel.value = station;
      }
      renderPersonnelList();
    });

    renderPersonnelList();
  }

  function renderPersonnelList() {
    const wrap = document.getElementById('personnel-list');
    const filterSel = document.getElementById('personnel-filter-station');
    if (!wrap || !filterSel) return;

    const selectedStation = filterSel.value;
    if (!selectedStation) {
      wrap.innerHTML = '<div class="empty-state">Välj en station för att visa personal.</div>';
      return;
    }

    const personnel = (state.personnel || []).filter((p) => p.station === selectedStation);
    if (!personnel.length) {
      wrap.innerHTML = '<div class="empty-state">Ingen personal tillagd för vald station ännu.</div>';
      return;
    }

    const byStation = {};
    personnel.forEach((p) => {
      if (!byStation[p.station]) byStation[p.station] = [];
      byStation[p.station].push(p);
    });

    wrap.innerHTML = Object.keys(byStation).sort((a, b) => a.localeCompare(b, 'sv')).map((station) => `
      <div class="personnel-group">
        <div class="personnel-group-title">${escapeHtml(station)}</div>
        ${byStation[station].map((p) => `
          <div class="personnel-row">
            <span>${escapeHtml(p.name)}</span>
            <button class="btn btn-danger btn-sm js-remove-person" data-id="${escapeAttribute(p.id)}" type="button">Ta bort</button>
          </div>
        `).join('')}
      </div>
    `).join('');

    wrap.querySelectorAll('.js-remove-person').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.personnel = (state.personnel || []).filter((p) => p.id !== btn.dataset.id);
        saveState();
        renderPersonnelList();
      });
    });
  }

  function renderCalendar() {
    const grid = document.getElementById('calendar-grid');
    const monthLabel = new Intl.DateTimeFormat('sv-SE', { month: 'long', year: 'numeric' })
      .format(new Date(runtime.calendarYear, runtime.calendarMonth, 1));
    calendarTitle.textContent = capitalize(monthLabel);
    grid.innerHTML = '';

    const firstDay = new Date(runtime.calendarYear, runtime.calendarMonth, 1);
    const lastDay = new Date(runtime.calendarYear, runtime.calendarMonth + 1, 0);
    const leadingOffset = (firstDay.getDay() + 6) % 7;
    const totalCells = Math.ceil((leadingOffset + lastDay.getDate()) / 7) * 7;

    for (let index = 0; index < totalCells; index += 1) {
      const dayNumber = index - leadingOffset + 1;
      const date = new Date(runtime.calendarYear, runtime.calendarMonth, dayNumber);
      const inMonth = dayNumber >= 1 && dayNumber <= lastDay.getDate();
      const key = formatDateKey(date);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `calendar-day${inMonth ? '' : ' muted'}${runtime.selectedDates.has(key) ? ' selected' : ''}`;
      button.innerHTML = `
        <span class="calendar-day-number">${date.getDate()}</span>
        <span class="calendar-day-note">${runtime.selectedDates.has(key) ? 'Vald' : ''}</span>
      `;
      button.disabled = !inMonth;
      if (inMonth) {
        button.addEventListener('click', () => toggleSelectedDate(date));
      }
      grid.appendChild(button);
    }
  }

  function toggleSelectedDate(date) {
    const key = formatDateKey(date);
    if (runtime.selectedDates.has(key)) {
      runtime.selectedDates.delete(key);
    } else {
      runtime.selectedDates.set(key, {
        date: key,
        startTime: document.getElementById('event-default-start').value || '08:30',
        endTime: document.getElementById('event-default-end').value || '16:00',
        location: ''
      });
    }
    renderCalendar();
    renderSelectedDates();
  }

  function renderSelectedDates() {
    const wrap = document.getElementById('selected-dates-list');
    wrap.innerHTML = '';
    const dates = [...runtime.selectedDates.values()].sort((a, b) => a.date.localeCompare(b.date));

    if (!dates.length) {
      wrap.innerHTML = '<div class="empty-state">Inga datum valda ännu.</div>';
      return;
    }

    dates.forEach((entry) => {
      const row = document.createElement('div');
      row.className = 'selected-date-row';
      row.innerHTML = `
        <div>
          <div class="selected-date-title">${formatLongDate(entry.date)}</div>
          <div class="selected-date-meta">Ange ort och tid för detta datum.</div>
        </div>
        <div class="stack gap-xs">
          <label class="field-label">Start</label>
          <input class="input js-start-time" type="time" value="${entry.startTime}">
        </div>
        <div class="stack gap-xs">
          <label class="field-label">Slut</label>
          <input class="input js-end-time" type="time" value="${entry.endTime}">
        </div>
        <div class="stack gap-xs">
          <label class="field-label">Ort</label>
          <select class="input js-location-select">${buildStationOptions(entry.location, true)}</select>
        </div>
        <button class="btn btn-danger js-remove-date" type="button">Ta bort</button>
      `;

      row.querySelector('.js-start-time').addEventListener('input', (event) => {
        entry.startTime = event.target.value;
      });
      row.querySelector('.js-end-time').addEventListener('input', (event) => {
        entry.endTime = event.target.value;
      });
      row.querySelector('.js-location-select').addEventListener('change', (event) => {
        entry.location = event.target.value;
      });
      row.querySelector('.js-remove-date').addEventListener('click', () => {
        runtime.selectedDates.delete(entry.date);
        renderCalendar();
        renderSelectedDates();
      });

      wrap.appendChild(row);
    });
  }

  function createEvent() {
    const title = document.getElementById('event-title').value.trim();
    const minParticipants = Number(document.getElementById('event-min').value);
    const maxParticipants = Number(document.getElementById('event-max').value);
    const organizerName = document.getElementById('organizer-name').value.trim();
    const organizerEmail = document.getElementById('organizer-email').value.trim();
    const eventComment = document.getElementById('event-comment').value.trim();
    const eventTags = [];
    if (document.getElementById('tag-fika').checked) eventTags.push('Fika ingår');
    if (document.getElementById('tag-lunch').checked) eventTags.push('Lunch ingår');
    if (document.getElementById('tag-larmstall').checked) eventTags.push('Ta med larmställ');
    const sessions = [...runtime.selectedDates.values()]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((entry) => ({
        id: entry.sessionId || createId(),
        date: entry.date,
        location: entry.location.trim(),
        startTime: entry.startTime,
        endTime: entry.endTime,
        signups: entry.signups || []
      }));

    if (!title) {
      window.alert('Du behöver ange namn på övningen.');
      return;
    }

    if (!sessions.length) {
      window.alert('Välj minst ett datum i kalendern.');
      return;
    }

    if (!sessions.every((session) => session.location && session.startTime && session.endTime)) {
      window.alert('Alla valda datum måste ha ort, starttid och sluttid.');
      return;
    }

    if (!Number.isFinite(minParticipants) || !Number.isFinite(maxParticipants) || minParticipants < 1 || maxParticipants < minParticipants) {
      window.alert('Kontrollera min/max antal. Max antal måste vara lika med eller större än min antal.');
      return;
    }

    if (runtime.editingEventId) {
      const existing = state.events.find((item) => item.id === runtime.editingEventId);
      if (existing) {
        existing.title = title;
        existing.minParticipants = minParticipants;
        existing.maxParticipants = maxParticipants;
        existing.organizerName = organizerName;
        existing.organizerEmail = organizerEmail;
        existing.eventComment = eventComment;
        existing.sessions = sessions;
          existing.eventTags = eventTags;
      }
    } else {
      state.events.unshift({
        id: createId(),
        title,
        minParticipants,
        maxParticipants,
        organizerName,
        organizerEmail,
        eventComment,
          eventTags,
        createdAt: new Date().toISOString(),
        sessions
      });
    }

    saveState();
    clearEventForm();
    renderAdminEvents();
  }

  function clearEventForm() {
    document.getElementById('event-title').value = '';
    document.getElementById('event-min').value = '6';
    document.getElementById('event-max').value = '15';
    document.getElementById('organizer-name').value = '';
    document.getElementById('organizer-email').value = '';
    document.getElementById('event-comment').value = '';
      document.getElementById('tag-fika').checked = false;
      document.getElementById('tag-lunch').checked = false;
      document.getElementById('tag-larmstall').checked = false;
    runtime.editingEventId = null;
    runtime.selectedDates = new Map();
    updateFormMode();
    renderCalendar();
    renderSelectedDates();
  }

  function updateFormMode() {
    const isEditing = !!runtime.editingEventId;
    const editingEvent = isEditing ? state.events.find((item) => item.id === runtime.editingEventId) : null;
    document.getElementById('btn-create-event').textContent = isEditing ? 'Spara ändringar' : 'Spara event';
    document.getElementById('btn-cancel-edit').hidden = !isEditing;
    document.getElementById('form-heading').textContent = isEditing
      ? `Redigerar: ${editingEvent ? editingEvent.title : ''}`
      : 'Skapa event / övning';
  }

  function startEditEvent(eventId) {
    const event = state.events.find((item) => item.id === eventId);
    if (!event) return;
    runtime.editingEventId = eventId;
    document.getElementById('event-title').value = event.title;
    document.getElementById('event-min').value = event.minParticipants;
    document.getElementById('event-max').value = event.maxParticipants;
    document.getElementById('organizer-name').value = event.organizerName || '';
    document.getElementById('organizer-email').value = event.organizerEmail || '';
    document.getElementById('event-comment').value = event.eventComment || '';
      const tags = Array.isArray(event.eventTags) ? event.eventTags : [];
      document.getElementById('tag-fika').checked = tags.includes('Fika ingår');
      document.getElementById('tag-lunch').checked = tags.includes('Lunch ingår');
      document.getElementById('tag-larmstall').checked = tags.includes('Ta med larmställ');
    if (event.sessions.length) {
      document.getElementById('event-default-start').value = event.sessions[0].startTime;
      document.getElementById('event-default-end').value = event.sessions[0].endTime;
    }
    runtime.selectedDates = new Map();
    event.sessions.forEach((session) => {
      runtime.selectedDates.set(session.date, {
        date: session.date,
        sessionId: session.id,
        signups: session.signups,
        startTime: session.startTime,
        endTime: session.endTime,
        location: session.location
      });
    });
    if (event.sessions.length) {
      const firstDate = new Date(event.sessions[0].date + 'T00:00:00');
      runtime.calendarYear = firstDate.getFullYear();
      runtime.calendarMonth = firstDate.getMonth();
    }
    updateFormMode();
    renderCalendar();
    renderSelectedDates();
    document.querySelector('.panel-main').scrollIntoView({ behavior: 'smooth' });
  }

  function renderAdminEvents() {
    const select = document.getElementById('admin-event-select');
    const previousId = select.value;

    select.innerHTML = '';
    if (!state.events.length) {
      select.innerHTML = '<option value="">Inga event skapade ännu</option>';
      document.getElementById('admin-events-list').innerHTML = '';
      return;
    }

    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Välj ett event...';
    select.appendChild(placeholder);

    state.events.forEach((event) => {
      const option = document.createElement('option');
      option.value = String(event.id);
      option.textContent = `${escapeHtml(event.title)} (${event.sessions.length} datum)`;
      select.appendChild(option);
    });

    // Restore previous selection if it still exists
    const stillExists = state.events.some((item) => String(item.id) === String(previousId));
    select.value = stillExists ? previousId : '';
    renderAdminEventDetail(select.value);

    select.onchange = () => renderAdminEventDetail(select.value);
  }

  function renderAdminEventDetail(eventId) {
    const wrap = document.getElementById('admin-events-list');
    wrap.innerHTML = '';
    if (!eventId) return;
    const event = state.events.find((item) => String(item.id) === String(eventId));
    if (!event) return;

    const card = document.createElement('article');
    card.className = 'event-card';
    card.innerHTML = `
      <div class="event-card-header">
        <div>
          <h3>${escapeHtml(event.title)}</h3>
          <p class="event-card-copy">${event.sessions.length} datum • Min ${event.minParticipants} • Max ${event.maxParticipants}</p>
        </div>
        <div class="event-card-actions">
          <button class="btn btn-secondary js-edit-event" type="button">Redigera</button>
          <button class="btn btn-danger js-delete-event" type="button">Ta bort</button>
        </div>
      </div>
    `;

    const list = document.createElement('div');
    list.className = 'event-session-list';
    event.sessions.forEach((session) => {
      const meta = document.createElement('div');
      meta.className = 'signup-sheet';
      meta.innerHTML = `
        <div class="signup-sheet-head">
          <div>
            <div class="signup-sheet-title">${formatLongDate(session.date)}</div>
            <div class="signup-sheet-location">${escapeHtml(session.location)}</div>
            <div class="signup-sheet-subtitle">${session.startTime}-${session.endTime}</div>
          </div>
          <div class="signup-capacity">${session.signups.length}/${event.maxParticipants} anmälda</div>
        </div>
      `;
      list.appendChild(meta);
    });

    card.appendChild(list);
    card.querySelector('.js-edit-event').addEventListener('click', () => {
      startEditEvent(event.id);
    });
    card.querySelector('.js-delete-event').addEventListener('click', () => {
      const confirmed = window.confirm(`Ta bort eventet "${event.title}"?`);
      if (!confirmed) return;
      state.events = state.events.filter((item) => String(item.id) !== String(event.id));
      saveState();
      renderAdminEvents();
    });

    wrap.appendChild(card);
  }

  function resetAllData() {
    const confirmed = window.confirm('Vill du verkligen rensa alla event och alla anmalningar?');
    if (!confirmed) return;
    const confirmedAgain = window.confirm('Detta går inte att ångra. Är du helt säker?');
    if (!confirmedAgain) return;
    localStorage.removeItem(STORAGE_KEY);
    Object.assign(state, loadState());
    saveState();
    clearEventForm();
    renderAdminEvents();
  }
}

function initPublicPage() {
  const modal = document.getElementById('signup-modal');
  const stationSelect = document.getElementById('signup-station');
  const eventSelect = document.getElementById('public-event-select');
  const printButton = document.getElementById('btn-print-event');
  const adminLoginButton = document.getElementById('btn-admin-login');
  const openAdminButton = document.getElementById('btn-open-admin');

  document.getElementById('btn-signup-cancel').addEventListener('click', closeSignupModal);
  document.getElementById('btn-signup-save').addEventListener('click', saveSignup);
  printButton.addEventListener('click', () => {
    openPrintView();
  });
  adminLoginButton.addEventListener('click', () => {
    if (isAdminAuthenticated()) {
      setAdminAuthenticated(false);
      updateAdminButtons();
      renderPublicEvents();
      return;
    }

    if (!requestAdminAuthentication()) return;
    updateAdminButtons();
    renderPublicEvents();
  });
  openAdminButton.addEventListener('click', () => {
    if (!requestAdminAuthentication()) return;
    updateAdminButtons();
    window.location.href = 'admin.html';
  });

  updateAdminButtons();
  renderPublicEvents();

  function updateAdminButtons() {
    const isAdmin = isAdminAuthenticated();
    openAdminButton.hidden = !isAdmin;
    adminLoginButton.textContent = isAdmin ? 'Logga ut' : 'Admin';
  }

  function openPrintView() {
    const printableEvent = document.querySelector('#public-events .event-card');
    if (!printableEvent) return;

    const selectedOption = eventSelect.options[eventSelect.selectedIndex];
    const printTitle = selectedOption ? selectedOption.textContent : 'Anmalningslista';
    const stylesheetUrl = new URL('styles.css', window.location.href).href;
    const printWindow = window.open('', '_blank', 'width=1280,height=900');

    if (!printWindow) {
      window.print();
      return;
    }

    printWindow.document.open();
    printWindow.document.write(`<!DOCTYPE html>
<html lang="sv">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(printTitle)}</title>
  <link rel="stylesheet" href="${stylesheetUrl}">
  <style>
    @page {
      size: A4;
      margin: 12mm;
    }

    html,
    body {
      margin: 0;
      padding: 0;
      background: #fff;
      color: #000;
    }

    body {
      padding: 0;
    }

    .print-root {
      width: 184mm;
      margin: 0 auto;
    }

    .public-events,
    .event-card,
    .signup-sheet {
      margin: 0 !important;
      border: 0 !important;
      box-shadow: none !important;
      background: #fff !important;
    }

    .event-card {
      padding: 0 !important;
    }

    .signup-actions,
    .no-print {
      display: none !important;
    }
  </style>
</head>
<body>
  <div class="print-root">${printableEvent.outerHTML}</div>
  <script>
    window.addEventListener('load', () => {
      const runPrint = () => {
        window.focus();
        window.print();
        window.setTimeout(() => window.close(), 300);
      };

      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => window.setTimeout(runPrint, 150));
      } else {
        window.setTimeout(runPrint, 300);
      }
    });
  <\/script>
</body>
</html>`);
    printWindow.document.close();
  }

  function renderPublicEvents() {
    const wrap = document.getElementById('public-events');
    const previousId = eventSelect.value;
    eventSelect.innerHTML = '';

    const todayKey = formatDateKey(new Date());
    const isAdmin = isAdminAuthenticated();

    const eventCandidates = [];
    state.events.forEach((event) => {
      let nextSessionKey = null;
      let lastSessionKey = null;
      event.sessions.forEach((session) => {
        const sessionDateKey = normalizeDateKey(session.date);
        if (!sessionDateKey) return;
        if (!lastSessionKey || sessionDateKey > lastSessionKey) {
          lastSessionKey = sessionDateKey;
        }
        if (sessionDateKey >= todayKey && (!nextSessionKey || sessionDateKey < nextSessionKey)) {
          nextSessionKey = sessionDateKey;
        }
      });
      if (nextSessionKey || (isAdmin && lastSessionKey)) {
        eventCandidates.push({ event, nextSessionKey, lastSessionKey });
      }
    });

    eventCandidates.sort((a, b) => {
      const aHasFuture = !!a.nextSessionKey;
      const bHasFuture = !!b.nextSessionKey;

      if (aHasFuture && bHasFuture) {
        return a.nextSessionKey.localeCompare(b.nextSessionKey);
      }

      if (aHasFuture !== bHasFuture) {
        return aHasFuture ? -1 : 1;
      }

      return (b.lastSessionKey || '').localeCompare(a.lastSessionKey || '');
    });

    if (!eventCandidates.length) {
      wrap.innerHTML = '';
      printButton.hidden = true;
      return;
    }

    eventCandidates.forEach(({ event }) => {
      const option = document.createElement('option');
      option.value = String(event.id);
      option.textContent = `${event.title} (${event.sessions.length} datum)`;
      eventSelect.appendChild(option);
    });

    const hasPrevious = eventCandidates.some(({ event }) => String(event.id) === String(previousId));
    eventSelect.value = hasPrevious ? String(previousId) : String(eventCandidates[0].event.id);
    renderPublicEventDetail(eventSelect.value);
    printButton.hidden = false;

    eventSelect.onchange = () => renderPublicEventDetail(eventSelect.value);
  }

  function renderPublicEventDetail(eventId) {
    const wrap = document.getElementById('public-events');
    wrap.innerHTML = '';
    if (!eventId) {
      printButton.hidden = true;
      return;
    }

    const event = state.events.find((item) => String(item.id) === String(eventId));
    if (!event) {
      printButton.hidden = true;
      return;
    }

    printButton.hidden = false;
    const article = document.createElement('article');
    article.className = 'event-card';
    const organizerLine = event.organizerName
      ? `<p class="event-organizer">Arrangör: ${escapeHtml(event.organizerName)}</p>`
      : '';
    const commentLine = event.eventComment
      ? `<p class="event-extra-info">${escapeHtml(event.eventComment)}</p>`
      : '';
      const tags = Array.isArray(event.eventTags) ? event.eventTags : [];
      const tagsHtml = tags.length
        ? `<div class="event-tag-list">${tags.map(t => `<span class="event-tag-chip">${escapeHtml(t)}</span>`).join('')}</div>`
        : '';
      const extraBlock = (tagsHtml || commentLine)
        ? `<div class="event-card-comment">${tagsHtml}${commentLine}</div>`
        : '';
    article.innerHTML = `
      <div class="event-card-header">
        <div class="event-card-main">
          <h2>${escapeHtml(event.title)}</h2>
          ${organizerLine}
          <p class="event-card-copy">Min ${event.minParticipants} deltagare • Max ${event.maxParticipants} deltagare</p>
        </div>
          ${extraBlock}
        <div class="event-badge">${event.sessions.length} datum</div>
      </div>
    `;

    const sessionList = document.createElement('div');
    sessionList.className = 'event-session-list';

    event.sessions
      .slice()
      .sort((a, b) => {
        const left = normalizeDateKey(a.date) || '9999-12-31';
        const right = normalizeDateKey(b.date) || '9999-12-31';
        return left.localeCompare(right);
      })
      .forEach((session) => {
        const signups = Array.isArray(session.signups) ? session.signups : [];
        const sessionDateKey = normalizeDateKey(session.date);
        const isPastSession = !sessionDateKey || sessionDateKey < formatDateKey(new Date());
        const sheet = document.createElement('section');
        sheet.className = 'signup-sheet';
        sheet.innerHTML = `
          <div class="signup-sheet-head">
            <div>
              <div class="signup-sheet-title">${formatLongDate(session.date)}</div>
              <div class="signup-sheet-location">${escapeHtml(session.location)}</div>
              <div class="signup-sheet-subtitle">${session.startTime}-${session.endTime}</div>
            </div>
            <div class="signup-capacity">${signups.length}/${event.maxParticipants} anmälda</div>
          </div>
        `;

        const table = document.createElement('table');
        table.className = 'signup-sheet-table';
        table.innerHTML = `
          <thead>
            <tr>
              <th>Antal</th>
              <th>Namn</th>
              <th>Station</th>
              <th class="no-print"></th>
            </tr>
          </thead>
          <tbody>
            ${buildSignupRows(signups, event.maxParticipants, event.minParticipants)}
          </tbody>
        `;

        table.addEventListener('click', (e) => {
          const clickTarget = e.target instanceof Element ? e.target : e.target && e.target.parentElement;
          if (!clickTarget) return;

          const attendanceCell = clickTarget.closest('.js-toggle-attendance');
          if (attendanceCell) {
            if (!isAdminAuthenticated()) {
              if (!requestAdminAuthentication()) return;
              updateAdminButtons();
            }
            const signupId = attendanceCell.dataset.signupId;
            const signup = session.signups.find((entry) => entry.id === signupId);
            if (!signup) return;
            signup.present = !signup.present;
            saveState();
            renderPublicEventDetail(eventId);
            return;
          }

          const btn = clickTarget.closest('.btn-remove-signup');
          if (!btn) return;
          const signupId = btn.dataset.signupId;
          const signup = session.signups.find((s) => s.id === signupId);
          if (!signup) return;
          const confirmed = window.confirm(`Avboka ${signup.name} från ${escapeHtml(event.title)} – ${formatLongDate(session.date)}?`);
          if (!confirmed) return;
          session.signups = session.signups.filter((s) => s.id !== signupId);
          saveState();
          sendOrganizerNotification(event, session, signup.name, signup.station, 'avbokad');
          renderPublicEvents();
        });

        const actions = document.createElement('div');
        actions.className = 'signup-actions';
        actions.innerHTML = `
          <div class="muted-text">Min antal: ${event.minParticipants}</div>
          <button class="btn btn-primary" type="button">Anmäl</button>
        `;

        if (isPastSession) {
          actions.querySelector('button').disabled = true;
          actions.querySelector('button').textContent = 'Passerat';
          actions.querySelector('button').classList.remove('btn-primary');
          actions.querySelector('button').classList.add('btn-secondary');
        } else if (signups.length >= event.maxParticipants) {
          actions.querySelector('button').disabled = true;
          actions.querySelector('button').textContent = 'Fullbokad';
          actions.querySelector('button').classList.remove('btn-primary');
          actions.querySelector('button').classList.add('btn-secondary');
        } else {
          actions.querySelector('button').addEventListener('click', () => openSignupModal(event.id, session.id));
        }

        sheet.appendChild(table);
        sheet.appendChild(actions);
        sessionList.appendChild(sheet);
      });

    article.appendChild(sessionList);
    wrap.appendChild(article);
  }

  function openSignupModal(eventId, sessionId) {
    const event = state.events.find((item) => String(item.id) === String(eventId));
    const session = event && event.sessions.find((item) => String(item.id) === String(sessionId));
    if (!event || !session) return;

    runtime.signupContext = { eventId, sessionId };
    document.getElementById('signup-modal-title').textContent = `Anmalan till ${event.title}`;
    document.getElementById('signup-modal-subtitle').textContent = `${formatLongDate(session.date)} \u2022 ${session.location} \u2022 ${session.startTime}-${session.endTime}`;
    const savedStation = localStorage.getItem('raddningstjansten-my-station') || '';
    const savedName = localStorage.getItem('raddningstjansten-my-name') || '';
    stationSelect.innerHTML = buildStationOptions(savedStation);
    updateNameFieldForStation(savedStation, savedName);
    stationSelect.onchange = () => updateNameFieldForStation(stationSelect.value, '');
    modal.hidden = false;
  }

  function closeSignupModal() {
    modal.hidden = true;
    runtime.signupContext = null;
  }

  function updateNameFieldForStation(station, preselectedName) {
    const nameContainer = document.getElementById('signup-name-container');
    const people = station
      ? (state.personnel || []).filter((p) => p.station === station).sort((a, b) => a.name.localeCompare(b.name, 'sv'))
      : [];

    if (people.length) {
      nameContainer.innerHTML = `
        <label class="field-label" for="signup-name">Namn</label>
        <select id="signup-name" class="input">
          <option value="">V\u00e4lj namn...</option>
          ${people.map((p) => `<option value="${escapeAttribute(p.name)}"${p.name === preselectedName ? ' selected' : ''}>${escapeHtml(p.name)}</option>`).join('')}
          <option value="__other__">Annan person...</option>
        </select>
      `;
      const sel = document.getElementById('signup-name');
      sel.onchange = () => {
        if (sel.value === '__other__') {
          nameContainer.innerHTML = `
            <label class="field-label" for="signup-name">Namn</label>
            <input id="signup-name" class="input" type="text" placeholder="F\u00f6rnamn Efternamn">
          `;
        }
      };
    } else {
      nameContainer.innerHTML = `
        <label class="field-label" for="signup-name">Namn</label>
        <input id="signup-name" class="input" type="text" placeholder="F\u00f6rnamn Efternamn" value="${escapeAttribute(preselectedName)}">
      `;
    }
  }

  function saveSignup() {
    const nameEl = document.getElementById('signup-name');
    const name = nameEl ? nameEl.value.trim() : '';
    const station = stationSelect.value;
    if (!runtime.signupContext) return;
    if (!name || name === '__other__' || !station) {
      window.alert('Fyll i bade namn och station.');
      return;
    }

    const event = state.events.find((item) => String(item.id) === String(runtime.signupContext.eventId));
    const session = event && event.sessions.find((item) => String(item.id) === String(runtime.signupContext.sessionId));
    if (!event || !session) return;

    if (session.signups.some((entry) => entry.name.toLowerCase() === name.toLowerCase())) {
      window.alert('Den har personen ar redan anmald till detta tillfalle.');
      return;
    }

    if (session.signups.length >= event.maxParticipants) {
      window.alert('Det har tillfallet ar redan fullt.');
      return;
    }

    const sessionDateKey = normalizeDateKey(session.date);
    if (!sessionDateKey || sessionDateKey < formatDateKey(new Date())) {
      window.alert('Detta tillfalle har redan passerat.');
      return;
    }

    localStorage.setItem('raddningstjansten-my-name', name);
    localStorage.setItem('raddningstjansten-my-station', station);
    session.signups.push({
      id: createId(),
      name,
      station,
      createdAt: new Date().toISOString()
    });
    saveState();
    sendOrganizerNotification(event, session, name, station, 'anmäld');

    const shouldCreateReminder = window.confirm('Vill du lägga till en kalenderpåminnelse för denna övning?');
    if (shouldCreateReminder) {
      downloadCalendarReminder(event, session, name);
    }

    closeSignupModal();
    renderPublicEvents();
  }
}

async function sendOrganizerNotification(event, session, signerName, signerStation, type) {
  const organizerEmail = event.organizerEmail || state.organizerEmail || '';
  if (!organizerEmail) return;

  try {
    await fetch('/.netlify/functions/send-mail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        organizerEmail,
        signerName,
        signerStation,
        type: type || 'anmäld',
        eventTitle: event.title,
        sessionDate: formatLongDate(session.date),
        sessionLocation: session.location,
        sessionTime: `${session.startTime}\u2013${session.endTime}`
      })
    });
  } catch {
    // Non-critical
  }
}

function downloadCalendarReminder(event, session, attendeeName) {
  const sessionDateKey = normalizeDateKey(session.date);
  if (!sessionDateKey) return;

  const startDate = buildLocalDateTime(sessionDateKey, session.startTime || '08:30');
  const endDate = buildLocalDateTime(sessionDateKey, session.endTime || '16:00');
  if (!startDate || !endDate) return;

  const uid = `${createId()}@raddningstjansten.local`;
  const nowUtc = formatIcsUtcTimestamp(new Date());
  const startLocal = formatIcsLocalTimestamp(startDate);
  const endLocal = formatIcsLocalTimestamp(endDate);
  const summary = escapeIcsText(`Övning: ${event.title}`);
  const location = escapeIcsText(session.location || 'Ej angiven ort');
  const description = escapeIcsText(`Anmäld: ${attendeeName} (${session.startTime}-${session.endTime})`);

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Raddningstjansten//Anmalningar//SV',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${nowUtc}`,
    `DTSTART:${startLocal}`,
    `DTEND:${endLocal}`,
    `SUMMARY:${summary}`,
    `LOCATION:${location}`,
    `DESCRIPTION:${description}`,
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  const safeTitle = (event.title || 'ovning').replace(/[^a-zA-Z0-9_-]+/g, '-');
  anchor.href = url;
  anchor.download = `${sessionDateKey}-${safeTitle}.ics`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function buildLocalDateTime(dateKey, timeValue) {
  const [year, month, day] = dateKey.split('-').map(Number);
  if (!year || !month || !day) return null;
  const [hour, minute] = String(timeValue || '00:00').split(':').map(Number);
  return new Date(year, month - 1, day, Number.isFinite(hour) ? hour : 0, Number.isFinite(minute) ? minute : 0, 0);
}

function formatIcsLocalTimestamp(date) {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `${year}${month}${day}T${hour}${minute}00`;
}

function formatIcsUtcTimestamp(date) {
  const year = String(date.getUTCFullYear());
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hour = String(date.getUTCHours()).padStart(2, '0');
  const minute = String(date.getUTCMinutes()).padStart(2, '0');
  const second = String(date.getUTCSeconds()).padStart(2, '0');
  return `${year}${month}${day}T${hour}${minute}${second}Z`;
}

function escapeIcsText(value) {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

function buildSignupRows(signups, maxParticipants, minParticipants) {
  const rows = [];
  for (let index = 0; index < maxParticipants; index += 1) {
    const signup = signups[index];
    const isMinMarker = index + 1 === minParticipants;
    const rowClass = isMinMarker ? ' class="min-marker-row"' : '';
    const nameCellClass = signup && signup.present ? ' is-present' : '';
    const nameCellAttrs = signup
      ? ` class="signup-name-cell js-toggle-attendance${nameCellClass}" data-signup-id="${escapeAttribute(signup.id)}"`
      : ` class="signup-name-cell${nameCellClass}"`;
    const removeBtn = signup
      ? `<button class="btn-remove-signup no-print" data-signup-id="${escapeAttribute(signup.id)}" type="button" title="Avboka">✕</button>`
      : '';
    rows.push(`
      <tr${rowClass}>
        <td>${index + 1}</td>
        <td${nameCellAttrs}>${signup ? escapeHtml(signup.name) : ''}</td>
        <td>${signup ? escapeHtml(signup.station) : ''}</td>
        <td class="no-print signup-remove-cell">${removeBtn}</td>
      </tr>
    `);
  }
  return rows.join('');
}

function buildStationOptions(selectedValue = '', includeBlank = true) {
  const options = includeBlank ? ['<option value="">Välj station</option>'] : [];
  return options
    .concat(state.stations.map((station) => {
      const selected = station === selectedValue ? ' selected' : '';
      return `<option value="${escapeAttribute(station)}"${selected}>${escapeHtml(station)}</option>`;
    }))
    .join('');
}

function formatDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseSessionDate(value) {
  if (!value) return null;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

function normalizeDateKey(value) {
  if (!value) return null;
  if (typeof value === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    if (/^\d{4}-\d{2}-\d{2}T/.test(value)) return value.slice(0, 10);

    // Handles strings containing a date such as "2026-5-7 00:00:00" or "2026-05-07 kl 08:00"
    const ymdMatch = value.match(/(\d{4})\D(\d{1,2})\D(\d{1,2})/);
    if (ymdMatch) {
      const year = ymdMatch[1];
      const month = ymdMatch[2].padStart(2, '0');
      const day = ymdMatch[3].padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    // Handles strings like "7/5/2026" or "07/05/2026"
    const dmyMatch = value.match(/(\d{1,2})\D(\d{1,2})\D(\d{4})/);
    if (dmyMatch) {
      const day = dmyMatch[1].padStart(2, '0');
      const month = dmyMatch[2].padStart(2, '0');
      const year = dmyMatch[3];
      return `${year}-${month}-${day}`;
    }

    const monthMap = {
      jan: '01', januari: '01',
      feb: '02', februari: '02',
      mar: '03', mars: '03',
      apr: '04', april: '04',
      maj: '05', may: '05',
      jun: '06', juni: '06',
      jul: '07', juli: '07',
      aug: '08', augusti: '08',
      sep: '09', sept: '09', september: '09',
      okt: '10', oktober: '10',
      nov: '11', november: '11',
      dec: '12', december: '12'
    };

    const monthNameMatch = value.toLowerCase().match(/(\d{1,2})\s+([a-zA-Z\u00E5\u00E4\u00F6]+)\s+(\d{4})/);
    if (monthNameMatch) {
      const day = monthNameMatch[1].padStart(2, '0');
      const month = monthMap[monthNameMatch[2]];
      const year = monthNameMatch[3];
      if (month) {
        return `${year}-${month}-${day}`;
      }
    }
  }
  const parsed = parseSessionDate(value);
  if (!parsed) return null;
  return formatDateKey(parsed);
}

function formatLongDate(value) {
  const date = typeof value === 'string' ? new Date(`${value}T12:00:00`) : value;
  return capitalize(new Intl.DateTimeFormat('sv-SE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  }).format(date));
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function createId() {
  if (window.crypto && typeof window.crypto.randomUUID === 'function') {
    return window.crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function escapeAttribute(value) {
  return escapeHtml(value);
}

function hasMeaningfulLocalData() {
  const fallback = getFallbackState();
  const hasEvents = Array.isArray(state.events) && state.events.length > 0;
  const hasCustomStations = Array.isArray(state.stations)
    && (state.stations.length !== fallback.stations.length
      || state.stations.some((value, index) => value !== fallback.stations[index]));
  return hasEvents || hasCustomStations;
}