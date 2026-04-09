async function run() {
  const res = await fetch("https://api.quran.com/api/v4/verses/by_chapter/1?words=true&audio=7");
  const data = await res.json();
  console.log(JSON.stringify(data.verses[0], null, 2));
}
run();
