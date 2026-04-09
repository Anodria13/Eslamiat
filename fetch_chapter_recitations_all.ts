async function run() {
  const res = await fetch("https://api.quran.com/api/v4/chapter_recitations/7");
  const data = await res.json();
  console.log(JSON.stringify(data.audio_files[0], null, 2));
}
run();
