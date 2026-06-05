/* ============================================================
   world diary — CONTENT / DATA  (edit this file)
   • Each place/dream has its text + map location here.
   • Drop that place's photos into its folder:
       content/places/<slug>/1.jpg … 4.jpg
       content/dreams/<slug>/1.jpg … 4.jpg
     (jpg or png; up to "photos" images. Missing ones show a
      placeholder telling you the exact path to add.)
   • To add a NEW place: copy a block, give it a unique slug,
     set lat/lng (the marker location), and make the folder.
   ============================================================ */
const GOAL = 100;
const REPO_URL = "https://github.com/akversebusiness-beep";

const PLACES = [
  { slug:"jaipur",      name:"Jaipur",      region:"Rajasthan, India",   date:"Home",     home:true, lat:26.9124, lng:75.7873, photos:4,
    story:"Home base — the Pink City. Amber Fort at dawn, the chaos of Johari Bazaar, and the rooftop view that starts and ends every trip." },
  { slug:"ranthambore", name:"Ranthambore", region:"Rajasthan, India",   date:"Nov 2023", lat:26.0173, lng:76.5026, photos:4,
    story:"Tiger country. Hours of patient jeep tracking through dry forest and ruined gates before the stripes finally stepped onto the road." },
  { slug:"sariska",     name:"Sariska",     region:"Rajasthan, India",   date:"Nov 2023", lat:27.3300, lng:76.4167, photos:4,
    story:"A quieter reserve in the Aravallis — peacocks, old temples, and a langur troop that owned the trail." },
  { slug:"darjeeling",  name:"Darjeeling",  region:"West Bengal, India", date:"Apr 2022", lat:27.0410, lng:88.2663, photos:4,
    story:"Toy train, first-flush tea gardens, and a 4am climb to Tiger Hill to watch Kanchenjunga catch fire in the sunrise." },
  { slug:"gangtok",     name:"Gangtok",     region:"Sikkim, India",      date:"Apr 2022", lat:27.3314, lng:88.6138, photos:4,
    story:"Mountain capital of prayer flags and momos, switchbacking up toward the high Himalaya and the Nathu La road." },
  { slug:"guwahati",    name:"Guwahati",    region:"Assam · NE India",   date:"Apr 2022", lat:26.1445, lng:91.7362, photos:4,
    story:"The gateway to the Northeast — the wide brown Brahmaputra at dusk and the hilltop Kamakhya temple." },
  { slug:"mount-abu",   name:"Mount Abu",   region:"Rajasthan, India",   date:"Dec 2021", lat:24.5926, lng:72.7156, photos:4,
    story:"Rajasthan's only hill station — cool air, the marble lacework of the Dilwara temples, and sunset point crowds." },
  { slug:"singapore",   name:"Singapore",   region:"Singapore",          date:"Jun 2019", lat:1.3521,  lng:103.8198, photos:4,
    story:"First trip abroad. Supertrees lighting up, hawker-centre dinners, and a skyline that felt like the future." },
  { slug:"bangkok",     name:"Bangkok",     region:"Thailand",           date:"Dec 2018", lat:13.7563, lng:100.5018, photos:4,
    story:"Temples and tuk-tuks by day, street food and night markets by night. Loud, golden, and unforgettable." },
  { slug:"delhi",       name:"Delhi",       region:"Delhi NCR, India",   date:"Often",    lat:28.6139, lng:77.2090, photos:4,
    story:"The capital I keep returning to — Mughal monuments, Old Delhi lanes, and friends across the city." },
  { slug:"gurugram",    name:"Gurugram",    region:"Haryana, India",     date:"Often",    lat:28.4595, lng:77.0266, photos:4,
    story:"Glass-tower work trips — late nights, big coffees, and the occasional rooftop with a skyline view." },
  { slug:"srinagar",    name:"Srinagar",    region:"Kashmir, India",     date:"May 2023", lat:34.0837, lng:74.7973, photos:4,
    story:"Dal Lake at dawn from a shikara, Mughal gardens in bloom, and snow still clinging to the surrounding peaks." },
  { slug:"porbandar",   name:"Porbandar",   region:"Gujarat, India",     date:"Dec 2022", lat:21.6417, lng:69.6293, photos:4,
    story:"Gandhi's birthplace on the Arabian Sea — quiet coastline, fishing harbour, and Kirti Mandir." },
  { slug:"kutch",       name:"Kutch",       region:"Gujarat, India",     date:"Dec 2022", lat:23.2419, lng:69.6669, photos:4,
    story:"The white desert of the Rann under a full moon — endless salt flats, folk music, and bitter cold nights." },
  { slug:"gir",         name:"Gir",         region:"Gujarat, India",     date:"Dec 2022", lat:21.1244, lng:70.8245, photos:4,
    story:"The last home of the Asiatic lion. A dawn safari through teak forest, and the moment a pride crossed ahead." },
  { slug:"udaipur",     name:"Udaipur",     region:"Rajasthan, India",   date:"Feb 2021", lat:24.5854, lng:73.7125, photos:4,
    story:"City of lakes — palaces floating on the water, narrow stepped lanes, and a sunset boat on Lake Pichola." },
  { slug:"bikaner",     name:"Bikaner",     region:"Rajasthan, India",   date:"Feb 2021", lat:28.0229, lng:73.3119, photos:4,
    story:"Desert fort city — Junagarh's painted halls, camels at the research farm, and fierce kachori in the bazaar." },
  { slug:"leh",         name:"Leh",         region:"Ladakh, India",      date:"Aug 2023", lat:34.1526, lng:77.5771, photos:4,
    story:"High-altitude moonscape at 3,500m — gompas on the ridgelines, Pangong's impossible blue, and thin cold air." },
  { slug:"pushkar",     name:"Pushkar",     region:"Rajasthan, India",   date:"Oct 2020", lat:26.4899, lng:74.5511, photos:4,
    story:"Holy lake town — ghats at dusk, the camel fair dust, and the only Brahma temple in the world." },
  { slug:"chittorgarh", name:"Chittorgarh", region:"Rajasthan, India",   date:"Oct 2020", lat:24.8887, lng:74.6269, photos:4,
    story:"India's largest fort — towers of victory, echoing palaces, and centuries of Rajput legend in the stone." },
  { slug:"kolkata",     name:"Kolkata",     region:"West Bengal, India", date:"Jan 2024", lat:22.5726, lng:88.3639, photos:4,
    story:"City of joy — yellow Ambassadors, the Howrah Bridge, rolls and roshogolla, and old colonial bones everywhere." },
  { slug:"bangalore",   name:"Bangalore",   region:"Karnataka, India",   date:"Jun 2026", lat:12.9716, lng:77.5946, photos:4,
    story:"Garden city turned tech hub — leafy avenues, craft-coffee mornings, and breezy evenings on the terrace." },
  { slug:"coimbatore",  name:"Coimbatore",  region:"Tamil Nadu, India",  date:"Jun 2026", lat:11.0168, lng:76.9558, photos:4,
    story:"Gateway to the Nilgiris — textile-mill city at the foot of the hills, filter coffee, and warm Tamil hospitality." },
  { slug:"ooty",        name:"Ooty",        region:"Tamil Nadu, India",  date:"Jun 2026", lat:11.4102, lng:76.6950, photos:4,
    story:"Queen of the hill stations — eucalyptus air, the rack railway through tea slopes, and rowboats on the lake." },
];

/* ---- dream / wishlist destinations (shown as blue markers) ---- */
const DREAMS = [
  { slug:"masai-mara",          name:"Masai Mara",                  region:"Kenya",           lat:-1.5000, lng:35.1400, photos:4,
    story:"The dream safari — the great wildebeest migration thundering across the Mara, balloons over the plains at sunrise." },
  { slug:"italy",               name:"Italy",                       region:"Rome, Italy",     lat:41.9028, lng:12.4964, photos:4,
    story:"Someday — Rome's ruins, Tuscan hills, Venetian canals, and pasta in a tiny trattoria with no English menu." },
  { slug:"northern-lights",     name:"Northern Lights",             region:"Tromsø · Arctic", lat:69.6492, lng:18.9553, photos:4,
    story:"Chasing the aurora above the Arctic Circle — green curtains over the snow, dog sleds, and a glass igloo night." },
  { slug:"paris",               name:"Paris",                       region:"France",          lat:48.8566, lng:2.3522,  photos:4,
    story:"The classic — the Tower sparkling on the hour, Seine walks, the Louvre, and a croissant at a corner café." },
  { slug:"greenland-chocolate", name:"Greenland Chocolate Factory", region:"Nuuk, Greenland", lat:64.1814, lng:-51.6941, photos:4,
    story:"The whimsical one — handmade chocolate at the edge of the ice, icebergs drifting past the harbour window." },
];
