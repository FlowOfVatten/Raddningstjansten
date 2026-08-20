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
  'Fyrislund',
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

let remoteSyncInFlight = false;
let remoteSyncPending = false;
let lastRemoteUpdatedAt = null;
let remotePollTimer = null;
let remoteSyncPromise = Promise.resolve(true);
let lastRemoteReadError = null;

const MOTTOS = [
  'Öva tills det känns självklart',
  'Varje repetition gör dig skarpare',
  'Övning är vägen från bra till oslagbar',
  'Små övningar idag, stora resultat imorgon',
  'Ju mer du övar, desto mindre behöver du hoppas på tur',
  'Öva idag, äg imorgon',
  'Varje repetition bygger din styrka',
  'Övning förvandlar möda till mästerskap',
  'Små steg i övning, stora kliv i skicklighet',
  'Ju oftare du övar, desto naturligare blir det perfekt'
];

const SMOKE_STATIONS = ['110', '120', '130', 'Tierp'];
const SMOKE_OWNER_FIELDS = [
  {
    value: '__owner-field-fyrislund__',
    label: 'Övningsfält Fyrislund',
    ownerStations: ['110', '120', '130']
  },
  {
    value: '__owner-field-tierp__',
    label: 'Övningsfält Tierp',
    ownerStations: ['Tierp']
  }
];
const EXCLUDED_TRAINING_STATIONS = new Set(['Fyrislund']);

const runtime = {
  calendarYear: new Date().getFullYear(),
  calendarMonth: new Date().getMonth(),
  selectedDates: new Map(),
  smokeCalendarYear: new Date().getFullYear(),
  smokeCalendarMonth: new Date().getMonth(),
  smokeSelectionMode: 'date',
  smokeSelectedDates: new Map(),
  smokeSelectedWeeks: new Map(),
  signupContext: null,
  editingEventId: null
};

bootstrap();

async function bootstrap() {
  bindRefreshButton();

  if (page === 'admin') {
    if (!ensureAdminAccess()) return;
    initAdminPage();
  }

  if (page === 'public') {
    displayRandomMotto();
    initPublicPage();
  }

  startRemotePolling();
  
  // Hämta gemensam state i bakgrunden utan att blockera sidan
  initializeSharedPersistence().catch(error => {
    console.error('Background state initialization failed:', error);
  });
}

function displayRandomMotto() {
  const mottoElement = document.getElementById('hero-motto');
  if (mottoElement && MOTTOS.length > 0) {
    const randomIndex = Math.floor(Math.random() * MOTTOS.length);
    mottoElement.textContent = MOTTOS[randomIndex];
  }
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
    smokeDrills: [],
    organizerName: '',
    organizerEmail: '',
    personnel: [...DEFAULT_PERSONNEL]
  };
}

function normalizeStatePayload(payload) {
  const fallback = getFallbackState();
  const parsed = payload && typeof payload === 'object' ? payload : fallback;

  const rawStations = Array.isArray(parsed.stations) && parsed.stations.length
    ? parsed.stations
    : [...DEFAULT_STATIONS];
  const savedStations = rawStations.map((s) => (s === '110 Fyrislund' ? 'Fyrislund' : s));
  const migratedStations = shouldMigrateStations(savedStations)
    ? [...DEFAULT_STATIONS]
    : mergeStations(savedStations, DEFAULT_STATIONS);
  const savedPersonnel = Array.isArray(parsed.personnel) ? parsed.personnel : [];

  return {
    stations: migratedStations,
    events: normalizeEvents(Array.isArray(parsed.events) ? parsed.events : []),
    smokeDrills: normalizeSmokeDrills(Array.isArray(parsed.smokeDrills) ? parsed.smokeDrills : []),
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

function normalizeSmokeDrills(smokeDrills) {
  return smokeDrills
    .filter((entry) => entry && typeof entry === 'object')
    .map((entry) => {
      const parsedGroup = Number(entry.groupNumber ?? entry.group);
      const parsedCount = Number(entry.participantCount ?? entry.antal);
      const scheduleType = entry.scheduleType === 'week' ? 'week' : 'date';
      const normalizedDate = normalizeDateKey(entry.date) || '';
      const normalizedWeekKey = typeof entry.weekKey === 'string' && entry.weekKey.trim()
        ? entry.weekKey.trim()
        : (scheduleType === 'week' && normalizedDate ? formatWeekKey(getIsoWeekInfo(normalizedDate)) : '');
      return {
        id: typeof entry.id === 'string' && entry.id ? entry.id : createId(),
        date: normalizedDate,
        scheduleType,
        weekKey: normalizedWeekKey,
        ownerStation: typeof entry.ownerStation === 'string' && entry.ownerStation.trim()
          ? entry.ownerStation.trim()
          : (typeof entry.station === 'string' ? entry.station.trim() : ''),
        trainingStation: typeof entry.trainingStation === 'string' && entry.trainingStation.trim()
          ? entry.trainingStation.trim()
          : (typeof entry.station === 'string' ? entry.station.trim() : ''),
        drillType: entry.drillType === 'kall' ? 'kall' : 'varm',
        groupNumber: Number.isInteger(parsedGroup) && parsedGroup >= 1 && parsedGroup <= 4 ? parsedGroup : null,
        participantCount: Number.isInteger(parsedCount) && parsedCount >= 1 && parsedCount <= 9 ? parsedCount : null,
        leaderName: typeof entry.leaderName === 'string' && entry.leaderName.trim()
          ? entry.leaderName.trim()
          : (typeof entry.styrkeledare === 'string' ? entry.styrkeledare.trim() : ''),
        createdAt: typeof entry.createdAt === 'string' ? entry.createdAt : new Date().toISOString()
      };
    })
    .filter((entry) => entry.date && entry.ownerStation && entry.trainingStation)
    .sort((a, b) => a.date.localeCompare(b.date));
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

function persistStateLocally() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function saveState() {
  persistStateLocally();
  queueRemoteSync();
}

async function saveStateAndWaitForRemote() {
  persistStateLocally();
  return queueRemoteSync();
}

function isRemoteEnabled() {
  // Azure Functions API är alltid tillgängligt när appen körs via SWA
  return true;
}

async function apiRequest(path, options = {}) {
  const response = await fetch(`/api/${path}`, {
    method: options.method || 'GET',
    headers: Object.assign({ 'Content-Type': 'application/json' }, options.headers || {}),
    body: options.body
  });

  if (!response.ok) {
    let details = '';
    try { details = await response.text(); } catch { details = ''; }
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
  const result = await apiRequest(`state?id=${encodeURIComponent(REMOTE_STATE_ID)}`);
  if (!result.ok) {
    lastRemoteReadError = result.error || `HTTP ${result.status || 'error'}`;
    console.error('Could not read shared state from remote.', result.error);
    return null;
  }

  lastRemoteReadError = null;

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
  if (!isRemoteEnabled()) return Promise.resolve(true);
  if (remoteSyncInFlight) {
    remoteSyncPending = true;
    return remoteSyncPromise;
  }
  remoteSyncInFlight = true;
  remoteSyncPromise = pushStateToRemote().finally(() => {
    remoteSyncInFlight = false;
    if (remoteSyncPending) {
      remoteSyncPending = false;
      remoteSyncPromise = queueRemoteSync();
    }
  });
  return remoteSyncPromise;
}

async function pushStateToRemote() {
  if (!isRemoteEnabled()) return true;

  const timestamp = new Date().toISOString();

  const result = await apiRequest('state', {
    method: 'PUT',
    body: JSON.stringify({ id: REMOTE_STATE_ID, payload: state, updated_at: timestamp })
  });

  if (!result.ok) {
    console.error('Could not sync shared state to remote.', result.error);
    return false;
  }

  lastRemoteUpdatedAt = timestamp;
  return true;
}

function startRemotePolling() {
  if (!isRemoteEnabled() || remotePollTimer) return;

  remotePollTimer = window.setInterval(async () => {
    if (remoteSyncInFlight) return;
    if (page === 'admin' && runtime.editingEventId) return;

    try {
      const result = await apiRequest(`state?id=${encodeURIComponent(REMOTE_STATE_ID)}`);
      if (!result.ok || !Array.isArray(result.data) || !result.data.length) return;

      const data = result.data[0];
      if (!data || !data.updated_at) return;

      if (isRemoteTimestampNewer(data.updated_at, lastRemoteUpdatedAt)) {
        window.location.reload();
      }
    } catch {
      // Ignore polling errors and keep local app usable.
    }
  }, 15000);
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
        window.alert('Remote är inte tillgängligt just nu.');
        return;
      }

      const data = await pullStateFromRemote();
      if (!data || !data.payload) {
        if (lastRemoteReadError) {
          window.alert(`Kunde inte nå delad databas just nu. Fel: ${lastRemoteReadError}`);
        } else {
          window.alert('Ingen delad data hittades i databasen ännu.');
        }
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
  let rerenderSmokeCalendar = () => {};
  let rerenderSelectedSmokeDates = () => {};

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
  document.getElementById('btn-reset-events').addEventListener('click', resetEventsData);
  document.getElementById('btn-reset-smoke').addEventListener('click', resetSmokeData);

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
  initAdminModeSwitch();
  initSmokeDrillSection();
  initPersonnelSection();

  function initAdminModeSwitch() {
    const btnEvents = document.getElementById('btn-admin-mode-events');
    const btnSmoke = document.getElementById('btn-admin-mode-smoke');
    const modeNodes = document.querySelectorAll('[data-admin-mode]');
    let adminMode = 'events';

    const setMode = (mode) => {
      adminMode = mode;
      modeNodes.forEach((node) => {
        node.hidden = node.dataset.adminMode !== adminMode;
      });

      if (btnEvents) {
        btnEvents.classList.toggle('btn-primary', adminMode === 'events');
        btnEvents.classList.toggle('btn-secondary', adminMode !== 'events');
      }
      if (btnSmoke) {
        btnSmoke.classList.toggle('btn-primary', adminMode === 'smoke');
        btnSmoke.classList.toggle('btn-secondary', adminMode !== 'smoke');
      }
    };

    if (btnEvents) {
      btnEvents.addEventListener('click', () => setMode('events'));
    }
    if (btnSmoke) {
      btnSmoke.addEventListener('click', () => setMode('smoke'));
    }

    setMode('events');
  }

  function initSmokeDrillSection() {
    const smokeCalendarTitle = document.getElementById('smoke-calendar-title');
    const smokeCalendarHeading = document.getElementById('smoke-calendar-heading');
    const smokeCalendarCopy = document.getElementById('smoke-calendar-copy');
    const smokeCalendarWeekdays = document.getElementById('smoke-calendar-weekdays');
    const smokeCalendarGrid = document.getElementById('smoke-calendar-grid');
    const smokePrevMonthButton = document.getElementById('btn-smoke-prev-month');
    const smokeNextMonthButton = document.getElementById('btn-smoke-next-month');
    const ownerStationSelect = document.getElementById('smoke-owner-station');
    const typeSelect = document.getElementById('smoke-type');
    const weekModeToggle = document.getElementById('smoke-week-mode');
    const createButton = document.getElementById('btn-create-smoke');
    if (!smokeCalendarTitle || !smokeCalendarGrid || !smokePrevMonthButton || !smokeNextMonthButton || !ownerStationSelect || !typeSelect || !createButton || !weekModeToggle || !smokeCalendarHeading || !smokeCalendarCopy || !smokeCalendarWeekdays) return;

    weekModeToggle.checked = runtime.smokeSelectionMode === 'week';

    weekModeToggle.addEventListener('change', () => {
      runtime.smokeSelectionMode = weekModeToggle.checked ? 'week' : 'date';
      runtime.smokeSelectedDates = new Map();
      runtime.smokeSelectedWeeks = new Map();
      renderSmokeCalendar();
      renderSelectedSmokeDates();
    });

    smokePrevMonthButton.addEventListener('click', () => {
      runtime.smokeCalendarMonth -= 1;
      if (runtime.smokeCalendarMonth < 0) {
        runtime.smokeCalendarMonth = 11;
        runtime.smokeCalendarYear -= 1;
      }
      renderSmokeCalendar();
    });
    smokeNextMonthButton.addEventListener('click', () => {
      runtime.smokeCalendarMonth += 1;
      if (runtime.smokeCalendarMonth > 11) {
        runtime.smokeCalendarMonth = 0;
        runtime.smokeCalendarYear += 1;
      }
      renderSmokeCalendar();
    });

    createButton.addEventListener('click', () => {
      const ownerStation = ownerStationSelect.value;
      const drillType = typeSelect.value === 'kall' ? 'kall' : 'varm';
      const selectedEntries = getSelectedSmokeEntries();

      if (!ownerStation) {
        window.alert('Välj ägarstation.');
        return;
      }

      if (!selectedEntries.length) {
        window.alert(runtime.smokeSelectionMode === 'week'
          ? 'Lägg till minst en vecka för rökövningen.'
          : 'Lägg till minst ett datum för rökövningen.');
        return;
      }

      const missingTrainingStation = selectedEntries.some((entry) => !entry.trainingStation);
      if (missingTrainingStation) {
        window.alert(runtime.smokeSelectionMode === 'week'
          ? 'Välj vilken station som ska öva för varje vecka.'
          : 'Välj vilken station som ska öva för varje datum.');
        return;
      }

      const duplicate = selectedEntries.some((selectedEntry) =>
        (state.smokeDrills || []).some((existingEntry) =>
          getSmokeDrillPeriodKey(existingEntry) === getSmokeDrillPeriodKey(selectedEntry)
          && String(existingEntry.ownerStation || existingEntry.station) === ownerStation
          && String(existingEntry.trainingStation || existingEntry.station) === selectedEntry.trainingStation
        )
      );
      if (duplicate) {
        window.alert(runtime.smokeSelectionMode === 'week'
          ? 'Minst en vald vecka finns redan för denna kombination av stationer.'
          : 'Minst ett valt datum finns redan för denna kombination av stationer.');
        return;
      }

      if (!state.smokeDrills) state.smokeDrills = [];
      selectedEntries.forEach((entry) => {
        state.smokeDrills.push({
          id: createId(),
          date: entry.date,
          weekKey: entry.weekKey || '',
          scheduleType: entry.scheduleType || 'date',
          ownerStation,
          trainingStation: entry.trainingStation,
          drillType,
          createdAt: new Date().toISOString()
        });
      });
      state.smokeDrills = normalizeSmokeDrills(state.smokeDrills);
      saveState();

      runtime.smokeSelectedDates = new Map();
      runtime.smokeSelectedWeeks = new Map();
      ownerStationSelect.value = '';
      typeSelect.value = 'varm';
      renderSmokeCalendar();
      renderSelectedSmokeDates();
      renderAdminSmokeDrills();
    });

    rerenderSmokeCalendar = renderSmokeCalendar;
    rerenderSelectedSmokeDates = renderSelectedSmokeDates;

    renderSmokeCalendar();
    renderSelectedSmokeDates();
    renderAdminSmokeDrills();

    function renderSmokeCalendar() {
      const isWeekMode = runtime.smokeSelectionMode === 'week';
      const monthLabel = new Intl.DateTimeFormat('sv-SE', { month: 'long', year: 'numeric' })
        .format(new Date(runtime.smokeCalendarYear, runtime.smokeCalendarMonth, 1));
      smokeCalendarTitle.textContent = capitalize(monthLabel);
      smokeCalendarHeading.textContent = isWeekMode ? 'Välj rökövningsveckor' : 'Välj rökövningsdatum';
      smokeCalendarCopy.textContent = isWeekMode
        ? 'Klicka på de veckor som ska bokas och välj station per vecka nedan.'
        : 'Klicka på flera datum i kalendern.';
      smokeCalendarWeekdays.hidden = isWeekMode;
      smokeCalendarGrid.classList.toggle('week-grid', isWeekMode);
      smokeCalendarGrid.innerHTML = '';

      if (isWeekMode) {
        const firstDay = new Date(runtime.smokeCalendarYear, runtime.smokeCalendarMonth, 1);
        const lastDay = new Date(runtime.smokeCalendarYear, runtime.smokeCalendarMonth + 1, 0);
        let currentWeekStart = getStartOfIsoWeek(firstDay);
        const lastWeekStart = getStartOfIsoWeek(lastDay);

        while (currentWeekStart <= lastWeekStart) {
          const weekStart = new Date(currentWeekStart);
          const weekInfo = getIsoWeekInfo(currentWeekStart);
          const weekKey = formatWeekKey(weekInfo);
          const isSelected = runtime.smokeSelectedWeeks.has(weekKey);
          const button = document.createElement('button');
          button.type = 'button';
          button.className = `calendar-day week-calendar-day${isSelected ? ' selected' : ''}`;
          button.innerHTML = `
            <span class="calendar-day-number">Vecka ${weekInfo.week}</span>
            <span class="calendar-day-note">${formatWeekRange(weekStart)}</span>
          `;
          button.addEventListener('click', () => {
            if (runtime.smokeSelectedWeeks.has(weekKey)) {
              runtime.smokeSelectedWeeks.delete(weekKey);
            } else {
              runtime.smokeSelectedWeeks.set(weekKey, {
                date: formatDateKey(weekStart),
                trainingStation: ''
              });
            }
            renderSmokeCalendar();
            renderSelectedSmokeDates();
          });
          smokeCalendarGrid.appendChild(button);
          currentWeekStart = addDays(currentWeekStart, 7);
        }
        return;
      }

      const firstDay = new Date(runtime.smokeCalendarYear, runtime.smokeCalendarMonth, 1);
      const lastDay = new Date(runtime.smokeCalendarYear, runtime.smokeCalendarMonth + 1, 0);
      const leadingOffset = (firstDay.getDay() + 6) % 7;
      const totalCells = Math.ceil((leadingOffset + lastDay.getDate()) / 7) * 7;

      for (let index = 0; index < totalCells; index += 1) {
        const dayNumber = index - leadingOffset + 1;
        const date = new Date(runtime.smokeCalendarYear, runtime.smokeCalendarMonth, dayNumber);
        const inMonth = dayNumber >= 1 && dayNumber <= lastDay.getDate();
        const key = formatDateKey(date);
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `calendar-day${inMonth ? '' : ' muted'}${runtime.smokeSelectedDates.has(key) ? ' selected' : ''}`;
        button.innerHTML = `
          <span class="calendar-day-number">${date.getDate()}</span>
          <span class="calendar-day-note">${runtime.smokeSelectedDates.has(key) ? 'Vald' : ''}</span>
        `;
        button.disabled = !inMonth;
        if (inMonth) {
          button.addEventListener('click', () => {
            if (runtime.smokeSelectedDates.has(key)) {
              runtime.smokeSelectedDates.delete(key);
            } else {
              runtime.smokeSelectedDates.set(key, '');
            }
            renderSmokeCalendar();
            renderSelectedSmokeDates();
          });
        }
        smokeCalendarGrid.appendChild(button);
      }
    }

    function renderSelectedSmokeDates() {
      const wrap = document.getElementById('smoke-selected-dates-list');
      if (!wrap) return;

      const entries = getSelectedSmokeEntries();
      if (!entries.length) {
        wrap.innerHTML = runtime.smokeSelectionMode === 'week'
          ? '<div class="empty-state">Inga rökövningsveckor valda ännu.</div>'
          : '<div class="empty-state">Inga rökövningsdatum valda ännu.</div>';
        return;
      }

      wrap.innerHTML = entries.map((entry) => `
        <div class="smoke-drill-row">
          <div>
            <div class="selected-date-title">${formatSmokeDrillScheduleLabel(entry)}</div>
            <div class="selected-date-meta">${runtime.smokeSelectionMode === 'week' ? 'Välj station som ska öva denna vecka.' : 'Välj station som ska öva detta datum.'}</div>
          </div>
          <select class="input js-smoke-training-station" data-period-key="${escapeAttribute(getSmokeDrillPeriodKey(entry))}">${buildStationOptions(entry.trainingStation, true, { excludeTrainingStations: true })}</select>
          <button class="btn btn-danger btn-sm js-remove-smoke-date" type="button" data-period-key="${escapeAttribute(getSmokeDrillPeriodKey(entry))}">Ta bort</button>
        </div>
      `).join('');

      wrap.querySelectorAll('.js-smoke-training-station').forEach((select) => {
        select.addEventListener('change', (event) => {
          const target = event.target;
          if (!(target instanceof HTMLSelectElement)) return;
          const periodKey = target.dataset.periodKey || '';
          updateSmokeSelectionTrainingStation(periodKey, target.value);
        });
      });

      wrap.querySelectorAll('.js-remove-smoke-date').forEach((button) => {
        button.addEventListener('click', () => {
          removeSmokeSelection(button.dataset.periodKey || '');
          renderSmokeCalendar();
          renderSelectedSmokeDates();
        });
      });
    }

    function getSelectedSmokeEntries() {
      if (runtime.smokeSelectionMode === 'week') {
        return [...runtime.smokeSelectedWeeks.entries()]
          .map(([weekKey, entry]) => ({
            date: entry.date,
            weekKey,
            scheduleType: 'week',
            trainingStation: String(entry.trainingStation || '').trim()
          }))
          .sort((a, b) => a.weekKey.localeCompare(b.weekKey));
      }

      return [...runtime.smokeSelectedDates.entries()]
        .map(([date, trainingStation]) => ({
          date,
          weekKey: '',
          scheduleType: 'date',
          trainingStation: String(trainingStation || '').trim()
        }))
        .sort((a, b) => a.date.localeCompare(b.date));
    }

    function updateSmokeSelectionTrainingStation(periodKey, trainingStation) {
      if (periodKey.startsWith('week:')) {
        const weekKey = periodKey.slice(5);
        const current = runtime.smokeSelectedWeeks.get(weekKey);
        if (!current) return;
        runtime.smokeSelectedWeeks.set(weekKey, { ...current, trainingStation });
        return;
      }

      const dateKey = periodKey.startsWith('date:') ? periodKey.slice(5) : periodKey;
      if (!runtime.smokeSelectedDates.has(dateKey)) return;
      runtime.smokeSelectedDates.set(dateKey, trainingStation);
    }

    function removeSmokeSelection(periodKey) {
      if (periodKey.startsWith('week:')) {
        runtime.smokeSelectedWeeks.delete(periodKey.slice(5));
        return;
      }
      runtime.smokeSelectedDates.delete(periodKey.startsWith('date:') ? periodKey.slice(5) : periodKey);
    }
  }

  function renderAdminSmokeDrills() {
    const wrap = document.getElementById('admin-smoke-list');
    if (!wrap) return;

    const drills = normalizeSmokeDrills(state.smokeDrills || []);
    if (!drills.length) {
      wrap.innerHTML = '<div class="empty-state">Inga rökövningar skapade ännu.</div>';
      return;
    }

    wrap.innerHTML = drills
      .map((drill) => `
        <div class="smoke-drill-row">
          <div>
            <div class="selected-date-title">${formatSmokeDrillScheduleLabel(drill)}</div>
            <div class="selected-date-meta">${escapeHtml(formatSmokeOwnerStationLabel(drill.ownerStation))} • Övar ${escapeHtml(drill.trainingStation)} • ${escapeHtml(capitalize(drill.drillType))}</div>
          </div>
          <button class="btn btn-danger btn-sm js-delete-smoke" type="button" data-id="${escapeAttribute(drill.id)}">Ta bort</button>
        </div>
      `)
      .join('');

    wrap.querySelectorAll('.js-delete-smoke').forEach((button) => {
      button.addEventListener('click', () => {
        state.smokeDrills = (state.smokeDrills || []).filter((entry) => entry.id !== button.dataset.id);
        saveState();
        renderAdminSmokeDrills();
      });
    });
  }

  function initPersonnelSection() {
    const stationSel = document.getElementById('personnel-station');
    const filterSel = document.getElementById('personnel-filter-station');
    const nameInput = document.getElementById('personnel-name');
    const addBtn = document.getElementById('btn-add-personnel');
    if (!stationSel || !filterSel || !nameInput || !addBtn) return;

    stationSel.innerHTML = buildStationOptions('', false, { excludeTrainingStations: true });
    filterSel.innerHTML = `<option value="">Välj station...</option>${buildStationOptions('', false, { excludeTrainingStations: true })}`;
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
          <label class="field-label">Slutdatum (om flerdagsövning)</label>
          <input class="input js-end-date" type="date" value="${entry.endDate || ''}" min="${entry.date}" placeholder="Valfritt">
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
          <input class="input js-custom-location" type="text" placeholder="Annan plats – skriv och tryck Enter för att lägga till" style="margin-top:4px" value="">
        </div>
        <button class="btn btn-danger js-remove-date" type="button">Ta bort</button>
      `;

      row.querySelector('.js-end-date').addEventListener('input', (event) => {
        const val = event.target.value;
        entry.endDate = val && val > entry.date ? val : '';
      });
      row.querySelector('.js-start-time').addEventListener('input', (event) => {
        entry.startTime = event.target.value;
      });
      row.querySelector('.js-end-time').addEventListener('input', (event) => {
        entry.endTime = event.target.value;
      });
      row.querySelector('.js-location-select').addEventListener('change', (event) => {
        entry.location = event.target.value;
      });
      const customLocationInput = row.querySelector('.js-custom-location');
      const addCustomLocation = () => {
        const val = customLocationInput.value.trim();
        if (!val) return;
        if (!state.stations.includes(val)) {
          state.stations = [...state.stations, val];
          saveState();
        }
        const select = row.querySelector('.js-location-select');
        select.innerHTML = buildStationOptions(val, true);
        entry.location = val;
        customLocationInput.value = '';
      };
      customLocationInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') { event.preventDefault(); addCustomLocation(); }
      });
      customLocationInput.addEventListener('blur', addCustomLocation);
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
    const educationMaterials = [];
    for (let row = 1; row <= 3; row += 1) {
      const name = document.getElementById(`event-education-name-${row}`).value.trim();
      const url = document.getElementById(`event-education-link-${row}`).value.trim();
      if (!name && !url) continue;
      if (!name || !url) {
        window.alert(`Utbildningsmaterial rad ${row} maste ha bade namn och lank.`);
        return;
      }
      educationMaterials.push({ name, url });
    }
    const eventTags = [];
    if (document.getElementById('tag-fika').checked) eventTags.push('Fika ingår');
    if (document.getElementById('tag-lunch').checked) eventTags.push('Lunch ingår');
    if (document.getElementById('tag-larmstall').checked) eventTags.push('Ta med larmställ');
    const sessions = [...runtime.selectedDates.values()]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((entry) => ({
        id: entry.sessionId || createId(),
        date: entry.date,
        endDate: entry.endDate || null,
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
        existing.educationMaterials = educationMaterials;
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
        educationMaterials,
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
    for (let row = 1; row <= 3; row += 1) {
      document.getElementById(`event-education-name-${row}`).value = '';
      document.getElementById(`event-education-link-${row}`).value = '';
    }
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
    const materials = Array.isArray(event.educationMaterials) ? event.educationMaterials : [];
    const normalizedMaterials = materials
      .map((material) => {
        if (typeof material === 'string') {
          const value = material.trim();
          if (!value) return null;
          return { name: value, url: value };
        }
        if (material && typeof material === 'object') {
          const name = String(material.name || '').trim();
          const url = String(material.url || '').trim();
          if (!name && !url) return null;
          return { name: name || url, url };
        }
        return null;
      })
      .filter((material) => material && material.url)
      .slice(0, 3);
    for (let row = 1; row <= 3; row += 1) {
      const material = normalizedMaterials[row - 1];
      document.getElementById(`event-education-name-${row}`).value = material ? material.name : '';
      document.getElementById(`event-education-link-${row}`).value = material ? material.url : '';
    }
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
        endDate: session.endDate || '',
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
          <button class="btn btn-secondary js-share-event" type="button">Dela övning</button>
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
      const adminDateLabel = session.endDate && session.endDate > session.date
        ? `${formatLongDate(session.date)} – ${formatLongDate(session.endDate)}`
        : formatLongDate(session.date);
      meta.innerHTML = `
        <div class="signup-sheet-head">
          <div>
            <div class="signup-sheet-title">${adminDateLabel}</div>
            <div class="signup-sheet-location">Plats: ${escapeHtml(session.location)}</div>
            <div class="signup-sheet-subtitle">${session.startTime}-${session.endTime}</div>
          </div>
          <div class="signup-capacity">${session.signups.length}/${event.maxParticipants} anmälda</div>
        </div>
      `;
      list.appendChild(meta);
    });

    card.appendChild(list);
    card.querySelector('.js-share-event').addEventListener('click', () => {
      const base = window.location.origin + window.location.pathname.replace(/admin\.html$/, 'index.html');
      const url = `${base}?event=${encodeURIComponent(String(event.id))}`;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(() => {
          window.alert('Direktlänk kopierad till urklipp:\n' + url);
        }).catch(() => {
          window.prompt('Kopiera länken manuellt:', url);
        });
      } else {
        window.prompt('Kopiera länken manuellt:', url);
      }
    });
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

  function resetEventsData() {
    const confirmed = window.confirm('Vill du verkligen rensa alla vanliga event och alla anmälningar?');
    if (!confirmed) return;
    const confirmedAgain = window.confirm('Detta går inte att ångra. Är du helt säker?');
    if (!confirmedAgain) return;
    state.events = [];
    saveState();
    clearEventForm();
    renderAdminEvents();
  }

  function resetSmokeData() {
    const confirmed = window.confirm('Vill du verkligen rensa alla rökövningar?');
    if (!confirmed) return;
    const confirmedAgain = window.confirm('Detta går inte att ångra. Är du helt säker?');
    if (!confirmedAgain) return;
    state.smokeDrills = [];
    runtime.smokeSelectedDates = new Map();
    runtime.smokeSelectedWeeks = new Map();
    saveState();
    renderAdminSmokeDrills();
    rerenderSmokeCalendar();
    rerenderSelectedSmokeDates();
  }
}

function initPublicPage() {
  const modal = document.getElementById('signup-modal');
  const stationSelect = document.getElementById('signup-station');
  const eventSelect = document.getElementById('public-event-select');
  const smokeToggleButton = document.getElementById('btn-open-smoke-view');
  const eventsView = document.getElementById('public-events-view');
  const smokeView = document.getElementById('public-smoke-view');
  const smokeStationSelect = document.getElementById('public-smoke-station-select');
  const smokeListWrap = document.getElementById('public-smoke-drills');
  const adminLoginButton = document.getElementById('btn-admin-login');
  const openAdminButton = document.getElementById('btn-open-admin');
  let publicMode = 'events';

  document.getElementById('btn-signup-cancel').addEventListener('click', closeSignupModal);
  document.getElementById('btn-signup-save').addEventListener('click', saveSignup);
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
  if (smokeToggleButton) {
    smokeToggleButton.addEventListener('click', () => {
      publicMode = publicMode === 'events' ? 'smoke' : 'events';
      setPublicViewMode();
      if (publicMode === 'smoke') {
        renderPublicSmokeDrills();
      }
    });
  }
  if (smokeStationSelect) {
    const smokeStationOptions = getSmokeStationFilterOptions();
    smokeStationSelect.innerHTML = [
      '<option value="">Välj station för rökövning</option>',
      ...smokeStationOptions.map((option) => `<option value="${escapeAttribute(option.value)}">${escapeHtml(option.label)}</option>`)
    ].join('');
    smokeStationSelect.addEventListener('change', renderPublicSmokeDrills);
  }

  updateAdminButtons();
  renderPublicEvents();
  setPublicViewMode();

  function updateAdminButtons() {
    const isAdmin = isAdminAuthenticated();
    openAdminButton.hidden = !isAdmin;
    adminLoginButton.textContent = isAdmin ? 'Logga ut' : 'Admin';
  }

  function setPublicViewMode() {
    const showSmoke = publicMode === 'smoke';
    if (eventsView) eventsView.hidden = showSmoke;
    if (smokeView) smokeView.hidden = !showSmoke;
    if (smokeToggleButton) {
      smokeToggleButton.textContent = showSmoke ? 'Tillbaka till övningar' : 'Rökövning';
    }
  }

  function renderPublicSmokeDrills() {
    if (!smokeListWrap || !smokeStationSelect) return;

    const selectedFilter = smokeStationSelect.value;
    if (!selectedFilter) {
      smokeListWrap.innerHTML = '<div class="empty-state">Välj station för att se rökövningsdagar.</div>';
      return;
    }

    const selectedOwnerField = getSmokeOwnerFieldByValue(selectedFilter);
    const selectedLabel = selectedOwnerField
      ? selectedOwnerField.label
      : (smokeStationSelect.options[smokeStationSelect.selectedIndex]?.textContent || selectedFilter);

    const drills = normalizeSmokeDrills(state.smokeDrills || []).filter((entry) => {
      if (selectedOwnerField) {
        return selectedOwnerField.ownerStations.includes(String(entry.ownerStation || '').trim());
      }
      return String(entry.trainingStation || '').trim() === selectedFilter;
    });
    if (!drills.length) {
      smokeListWrap.innerHTML = `<div class="empty-state">Inga rökövningar planerade för ${escapeHtml(selectedLabel)}.</div>`;
      return;
    }

    const drillsByWeek = new Map();
    drills.forEach((drill) => {
      const weekInfo = getIsoWeekInfo(drill.date);
      const weekKey = `${weekInfo.year}-W${String(weekInfo.week).padStart(2, '0')}`;
      if (!drillsByWeek.has(weekKey)) {
        drillsByWeek.set(weekKey, {
          year: weekInfo.year,
          week: weekInfo.week,
          drills: []
        });
      }
      drillsByWeek.get(weekKey).drills.push(drill);
    });

    const weeklySectionsHtml = [...drillsByWeek.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([, group]) => `
        <section class="smoke-week-group">
          <h3 class="smoke-week-title">Vecka ${group.week} (${group.year})</h3>
          <div class="event-session-list smoke-week-list">
            ${group.drills.map((drill) => `
              <section class="signup-sheet smoke-signup-sheet smoke-signup-sheet--${drill.drillType === 'kall' ? 'kall' : 'varm'}">
                <div class="signup-sheet-head smoke-signup-sheet-head smoke-signup-sheet-head--${drill.drillType === 'kall' ? 'kall' : 'varm'}">
                  <div>
                    <div class="signup-sheet-title">${formatSmokeDrillScheduleLabel(drill)}</div>
                    <div class="signup-sheet-location">${escapeHtml(formatSmokeOwnerStationLabel(drill.ownerStation))} • Övar ${escapeHtml(drill.trainingStation)}</div>
                    <div class="signup-sheet-subtitle">${escapeHtml(capitalize(drill.drillType))} rökövning</div>
                    ${drill.drillType === 'kall'
                      ? ''
                      : `<div class="smoke-card-meta" data-smoke-meta-id="${escapeAttribute(drill.id)}">${drill.groupNumber ? `Grupp ${drill.groupNumber}` : 'Grupp ej satt'} • ${drill.participantCount ? `Antal ${drill.participantCount}` : 'Antal ej satt'}<br>${drill.leaderName ? `Styrkeledare ${escapeHtml(drill.leaderName)}` : 'Styrkeledare ej satt'}</div>`}
                  </div>
                  <div class="smoke-card-actions">
                    ${drill.drillType === 'kall'
                      ? ''
                      : `<button class="btn btn-secondary btn-sm js-edit-smoke-card" type="button" data-smoke-id="${escapeAttribute(drill.id)}">Redigera</button>`}
                  </div>
                </div>
                <div class="smoke-card-editor" data-smoke-editor-id="${escapeAttribute(drill.id)}" hidden>
                  <select class="input js-smoke-group" data-smoke-id="${escapeAttribute(drill.id)}">
                    <option value="">Grupp</option>
                    ${[1, 2, 3, 4].map((n) => `<option value="${n}"${drill.groupNumber === n ? ' selected' : ''}>Grupp ${n}</option>`).join('')}
                  </select>
                  <select class="input js-smoke-count" data-smoke-id="${escapeAttribute(drill.id)}">
                    <option value="">Antal</option>
                    ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `<option value="${n}"${drill.participantCount === n ? ' selected' : ''}>Antal ${n}</option>`).join('')}
                  </select>
                  <select class="input js-smoke-leader" data-smoke-id="${escapeAttribute(drill.id)}">
                    ${buildSmokeLeaderOptions(drill.trainingStation, drill.leaderName)}
                  </select>
                  <button class="btn btn-primary btn-sm js-save-smoke-card" type="button" data-smoke-id="${escapeAttribute(drill.id)}">Spara</button>
                  <button class="btn btn-secondary btn-sm js-cancel-smoke-card" type="button" data-smoke-id="${escapeAttribute(drill.id)}">Avbryt</button>
                </div>
              </section>
            `).join('')}
          </div>
        </section>
      `)
      .join('');

    smokeListWrap.innerHTML = `
      <article class="event-card">
        <div class="event-card-header">
          <div class="event-card-main">
            <h2>Rökövningar för ${escapeHtml(selectedLabel)}</h2>
            <p class="event-card-copy">${selectedOwnerField
              ? 'Visar alla veckor för ägarstationerna i valt övningsfält, grupperat per vecka.'
              : 'Visar planerade dagar och typ av rökövning, grupperat per vecka.'}</p>
          </div>
        </div>
        ${weeklySectionsHtml}
      </article>
    `;

    function buildSmokeLeaderOptions(trainingStation, selectedLeader) {
      const leaders = (state.personnel || [])
        .filter((person) => person.station === trainingStation)
        .map((person) => person.name)
        .sort((a, b) => a.localeCompare(b, 'sv'));
      const seen = new Set();
      const uniqueLeaders = leaders.filter((name) => {
        const key = name.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      if (selectedLeader && !uniqueLeaders.some((name) => name.toLowerCase() === selectedLeader.toLowerCase())) {
        uniqueLeaders.unshift(selectedLeader);
      }

      const baseOption = '<option value="">Styrkeledare</option>';
      if (!uniqueLeaders.length) {
        return `${baseOption}<option value="" disabled>Ingen personal på stationen</option>`;
      }
      return `${baseOption}${uniqueLeaders
        .map((name) => `<option value="${escapeAttribute(name)}"${name === selectedLeader ? ' selected' : ''}>${escapeHtml(name)}</option>`)
        .join('')}`;
    }

    smokeListWrap.querySelectorAll('.js-edit-smoke-card').forEach((button) => {
      button.addEventListener('click', () => {
        const smokeId = button.dataset.smokeId;
        if (!smokeId) return;
        const editor = smokeListWrap.querySelector(`[data-smoke-editor-id="${smokeId}"]`);
        if (editor) editor.hidden = false;
      });
    });

    smokeListWrap.querySelectorAll('.js-cancel-smoke-card').forEach((button) => {
      button.addEventListener('click', () => {
        const smokeId = button.dataset.smokeId;
        if (!smokeId) return;
        const editor = smokeListWrap.querySelector(`[data-smoke-editor-id="${smokeId}"]`);
        if (editor) editor.hidden = true;
      });
    });

    smokeListWrap.querySelectorAll('.js-save-smoke-card').forEach((button) => {
      button.addEventListener('click', () => {
        const smokeId = button.dataset.smokeId;
        if (!smokeId) return;

        const groupSelect = smokeListWrap.querySelector(`.js-smoke-group[data-smoke-id="${smokeId}"]`);
        const countSelect = smokeListWrap.querySelector(`.js-smoke-count[data-smoke-id="${smokeId}"]`);
        const leaderSelect = smokeListWrap.querySelector(`.js-smoke-leader[data-smoke-id="${smokeId}"]`);
        if (!(groupSelect instanceof HTMLSelectElement) || !(countSelect instanceof HTMLSelectElement) || !(leaderSelect instanceof HTMLSelectElement)) return;

        const groupNumber = Number(groupSelect.value);
        const participantCount = Number(countSelect.value);
        const leaderName = leaderSelect.value.trim();
        if (!Number.isInteger(groupNumber) || groupNumber < 1 || groupNumber > 4) {
          window.alert('Välj grupp 1-4.');
          return;
        }
        if (!Number.isInteger(participantCount) || participantCount < 1 || participantCount > 9) {
          window.alert('Välj antal 1-9.');
          return;
        }
        if (!leaderName) {
          window.alert('Välj styrkeledare.');
          return;
        }

        const smokeDrill = (state.smokeDrills || []).find((entry) => String(entry.id) === String(smokeId));
        if (!smokeDrill) return;
        smokeDrill.groupNumber = groupNumber;
        smokeDrill.participantCount = participantCount;
        smokeDrill.leaderName = leaderName;
        saveState();
        renderPublicSmokeDrills();
      });
    });
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
      return;
    }

    eventCandidates.forEach(({ event }) => {
      const option = document.createElement('option');
      option.value = String(event.id);
      option.textContent = `${event.title} (${event.sessions.length} datum)`;
      eventSelect.appendChild(option);
    });

    const hasPrevious = eventCandidates.some(({ event }) => String(event.id) === String(previousId));
    const deepLinkId = !previousId ? (new URLSearchParams(window.location.search)).get('event') : null;
    const deepLinkExists = deepLinkId && eventCandidates.some(({ event }) => String(event.id) === String(deepLinkId));
    if (deepLinkExists) {
      eventSelect.value = String(deepLinkId);
    } else {
      eventSelect.value = hasPrevious ? String(previousId) : String(eventCandidates[0].event.id);
    }
    renderPublicEventDetail(eventSelect.value);

    eventSelect.onchange = () => renderPublicEventDetail(eventSelect.value);
  }

  function renderPublicEventDetail(eventId) {
    const wrap = document.getElementById('public-events');
    wrap.innerHTML = '';
    if (!eventId) {
      return;
    }

    const event = state.events.find((item) => String(item.id) === String(eventId));
    if (!event) {
      return;
    }

    const article = document.createElement('article');
    article.className = 'event-card';
    const todayKey = formatDateKey(new Date());
    let openSessions = 0;
    let fullSessions = 0;
    let pastSessions = 0;
    event.sessions.forEach((session) => {
      const sessionDateKey = normalizeDateKey(session.date);
      if (!sessionDateKey || sessionDateKey < todayKey) {
        pastSessions += 1;
        return;
      }

      const signups = Array.isArray(session.signups) ? session.signups : [];
      if (signups.length >= event.maxParticipants) {
        fullSessions += 1;
      } else {
        openSessions += 1;
      }
    });
    const sessionStatusHtml = `<div class="event-session-status"><span>${openSessions} oppna</span><span>${fullSessions} fullbokade</span><span>${pastSessions} passerade</span></div>`;
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
      const materials = Array.isArray(event.educationMaterials)
        ? event.educationMaterials
            .map((material) => {
              if (typeof material === 'string') {
                const value = material.trim();
                if (!value) return null;
                return { name: value, url: value };
              }
              if (material && typeof material === 'object') {
                const name = String(material.name || '').trim();
                const url = String(material.url || '').trim();
                if (!url) return null;
                return { name: name || url, url };
              }
              return null;
            })
            .filter(Boolean)
        : [];
      const materialsHtml = materials.length
        ? `<div class="event-materials"><div class="event-materials-title">Utbildningsmaterial:</div><div class="event-material-links">${materials.map((m) => `<a href="${escapeAttribute(m.url)}" target="_blank" rel="noopener noreferrer" class="event-material-link">${escapeHtml(m.name)}</a>`).join('')}</div></div>`
        : '';
      const extraBlock = (tagsHtml || commentLine || materialsHtml)
        ? `<div class="event-card-comment">${tagsHtml}${commentLine}${materialsHtml}</div>`
        : '';
    article.innerHTML = `
      <div class="event-card-header">
        <div class="event-card-main">
          <h2>${escapeHtml(event.title)}</h2>
          ${organizerLine}
          <p class="event-card-copy">Min ${event.minParticipants} deltagare • Max ${event.maxParticipants} deltagare</p>
        </div>
        <div class="event-badge-row">
          <div class="event-badge">${event.sessions.length} datum</div>
          ${sessionStatusHtml}
          <button id="btn-print-event" class="btn btn-secondary" type="button">Skriv ut</button>
        </div>
      </div>
      ${extraBlock}
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
        const publicDateLabel = session.endDate && session.endDate > session.date
          ? `${formatLongDate(session.date)} \u2013 ${formatLongDate(session.endDate)}`
          : formatLongDate(session.date);
        const sheet = document.createElement('section');
        sheet.className = 'signup-sheet';
        sheet.innerHTML = `
          <div class="signup-sheet-head">
            <div>
              <div class="signup-sheet-title">${publicDateLabel}</div>
              <div class="signup-sheet-location">Plats: ${escapeHtml(session.location)}</div>
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
            if (isPastSession) return;
            const signupId = btn.dataset.signupId;
          const signup = session.signups.find((s) => s.id === signupId);
          if (!signup) return;
          const confirmed = window.confirm(`Avboka ${signup.name} från ${escapeHtml(event.title)} – ${formatLongDate(session.date)}?`);
          if (!confirmed) return;
          session.signups = session.signups.filter((s) => s.id !== signupId);
          saveState();
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
    const printBtn = article.querySelector('#btn-print-event');
    if (printBtn) {
      printBtn.addEventListener('click', () => {
        openPrintView();
      });
    }
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
    stationSelect.innerHTML = buildStationOptions(savedStation, true, { excludeTrainingStations: true });
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

  async function saveSignup() {
    const saveButton = document.getElementById('btn-signup-save');
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
    
    // Lägg automatiskt till personen i personalregistret för stationen om de inte redan finns
    const existingPersonnel = state.personnel.find(
      (p) => p.name.toLowerCase() === name.toLowerCase() && p.station === station
    );
    if (!existingPersonnel) {
      state.personnel.push({
        id: createId(),
        name,
        station
      });
    }

    if (saveButton) {
      saveButton.disabled = true;
      saveButton.textContent = 'Sparar...';
    }

    try {
      const remoteSaved = await saveStateAndWaitForRemote();
      if (!remoteSaved) {
        window.alert('Anmälan sparades lokalt men kunde inte bekräftas i databasen just nu. Vänta kvar på sidan och kontrollera att du syns i listan innan du stänger den.');
        return;
      }

      closeSignupModal();
      renderPublicEvents();

      const shouldCreateReminder = window.confirm(`Du är nu anmäld till ${event.title} den ${formatLongDate(session.date)}.\n\nVill du också lägga till en kalenderpåminnelse?`);
      if (shouldCreateReminder) {
        downloadCalendarReminder(event, session, name);
      }
    } finally {
      if (saveButton) {
        saveButton.disabled = false;
        saveButton.textContent = 'Spara anmälan';
      }
    }
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

function buildStationOptions(selectedValue = '', includeBlank = true, config = {}) {
  return buildStationOptionsWithConfig(selectedValue, includeBlank, config);
}

function buildStationOptionsWithConfig(selectedValue = '', includeBlank = true, config = {}) {
  const options = includeBlank ? ['<option value="">Välj station</option>'] : [];
  const stations = config.excludeTrainingStations
    ? getTrainingStations()
    : state.stations;
  return options
    .concat(stations.map((station) => {
      const selected = station === selectedValue ? ' selected' : '';
      return `<option value="${escapeAttribute(station)}"${selected}>${escapeHtml(station)}</option>`;
    }))
    .join('');
}

function getTrainingStations() {
  return state.stations.filter((station) => !EXCLUDED_TRAINING_STATIONS.has(station));
}

function getSmokeStationFilterOptions() {
  const ownerStations = SMOKE_OWNER_FIELDS.map((field) => ({
    value: field.value,
    label: field.label
  }));
  const nonOwnerStations = getTrainingStations()
    .filter((station) => !SMOKE_STATIONS.includes(station))
    .sort((a, b) => a.localeCompare(b, 'sv'))
    .map((station) => ({ value: station, label: station }));
  return [...ownerStations, ...nonOwnerStations];
}

function getSmokeOwnerFieldByValue(value) {
  return SMOKE_OWNER_FIELDS.find((field) => field.value === value) || null;
}

function formatSmokeOwnerStationLabel(ownerStation) {
  const owner = String(ownerStation || '').trim();
  if (!owner) {
    return 'Ägarstation';
  }

  if (owner.toLowerCase() === 'utbildning') {
    return 'Utbildning';
  }

  return `Ägarstation ${owner}`;
}

function getSmokeDrillPeriodKey(entry) {
  const scheduleType = entry && entry.scheduleType === 'week' ? 'week' : 'date';
  if (scheduleType === 'week') {
    const weekKey = typeof entry.weekKey === 'string' && entry.weekKey.trim()
      ? entry.weekKey.trim()
      : formatWeekKey(getIsoWeekInfo(entry.date));
    return `week:${weekKey}`;
  }

  return `date:${normalizeDateKey(entry.date) || ''}`;
}

function formatSmokeDrillScheduleLabel(entry) {
  if (entry && entry.scheduleType === 'week') {
    const weekInfo = entry.weekKey ? parseWeekKey(entry.weekKey) : getIsoWeekInfo(entry.date);
    if (weekInfo) {
      return `Vecka ${weekInfo.week} (${weekInfo.year})`;
    }
  }
  return formatLongDate(entry.date);
}

function formatWeekKey(weekInfo) {
  return `${weekInfo.year}-W${String(weekInfo.week).padStart(2, '0')}`;
}

function parseWeekKey(weekKey) {
  const match = String(weekKey || '').match(/^(\d{4})-W(\d{2})$/);
  if (!match) return null;
  return {
    year: Number(match[1]),
    week: Number(match[2])
  };
}

function getStartOfIsoWeek(value) {
  const date = typeof value === 'string' ? new Date(`${value}T12:00:00`) : new Date(value);
  const day = date.getDay() || 7;
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() - day + 1);
  return date;
}

function addDays(date, days) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function formatWeekRange(weekStart) {
  const weekEnd = addDays(weekStart, 6);
  const sameMonth = weekStart.getMonth() === weekEnd.getMonth();
  const startLabel = new Intl.DateTimeFormat('sv-SE', sameMonth
    ? { day: 'numeric' }
    : { day: 'numeric', month: 'short' }).format(weekStart);
  const endLabel = new Intl.DateTimeFormat('sv-SE', { day: 'numeric', month: 'short' }).format(weekEnd);
  return `${capitalize(startLabel)} - ${capitalize(endLabel)}`;
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

function getIsoWeekInfo(value) {
  const date = typeof value === 'string' ? new Date(`${value}T12:00:00`) : new Date(value);
  const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((utcDate - yearStart) / 86400000) + 1) / 7);
  return {
    year: utcDate.getUTCFullYear(),
    week
  };
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