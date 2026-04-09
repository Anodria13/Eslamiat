async function run() {
  const res = await fetch("https://api.quran.com/api/v4/chapter_recitations/7/1?timestamps=true");
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}
run();
