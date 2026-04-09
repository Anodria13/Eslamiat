async function run() {
  const res = await fetch("https://api.qurancdn.com/api/qdc/audio/reciters/7/audio_files?chapter=1&segments=true");
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}
run();
