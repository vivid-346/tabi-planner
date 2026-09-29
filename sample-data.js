/* サンプルデータ（架空の旅行1件）。ブラウザの保存領域が空のときだけ読み込まれる。
   キーは保存パス（trips/<旅行ID>、trips/<旅行ID>/items/<予定ID> など）、値はその中身。 */
window.SAMPLE_DATA={
 "trips/sample-kyoto": {
  "title": "サンプル：京都 2泊3日",
  "start": "2027-04-02",
  "end": "2027-04-04",
  "people": 2,
  "route": "名古屋 → 京都 → 名古屋",
  "color": "green",
  "created": 1790000000000
 },
 "trips/sample-kyoto/days/2027-04-02": {
  "city": "祇園・清水寺",
  "memo": ""
 },
 "trips/sample-kyoto/days/2027-04-03": {
  "city": "嵐山・金閣寺",
  "memo": ""
 },
 "trips/sample-kyoto/days/2027-04-04": {
  "city": "伏見・京都駅",
  "memo": ""
 },
 "trips/sample-kyoto/spots/kiyomizu": {
  "name": "清水寺",
  "city": "清水寺",
  "cat": "see",
  "stars": 3,
  "fee": "",
  "book": false,
  "note": "これは架空のサンプルデータです",
  "url": "",
  "created": 1790000000000
 },
 "trips/sample-kyoto/spots/gion": {
  "name": "祇園の街歩き",
  "city": "祇園",
  "cat": "view",
  "stars": 2,
  "fee": "無料",
  "book": false,
  "note": "",
  "url": "",
  "created": 1790000000001
 },
 "trips/sample-kyoto/spots/bamboo": {
  "name": "竹林の小径",
  "city": "嵐山",
  "cat": "view",
  "stars": 3,
  "fee": "無料",
  "book": false,
  "note": "朝早いほうが空いている",
  "url": "",
  "created": 1790000000002
 },
 "trips/sample-kyoto/spots/kinkaku": {
  "name": "金閣寺",
  "city": "金閣寺",
  "cat": "see",
  "stars": 2,
  "fee": "",
  "book": false,
  "note": "",
  "url": "",
  "created": 1790000000003
 },
 "trips/sample-kyoto/spots/fushimi": {
  "name": "伏見稲荷大社",
  "city": "伏見",
  "cat": "see",
  "stars": 3,
  "fee": "無料",
  "book": false,
  "note": "",
  "url": "",
  "created": 1790000000004
 },
 "trips/sample-kyoto/spots/nishiki": {
  "name": "錦市場",
  "city": "京都駅",
  "cat": "food",
  "stars": 1,
  "fee": "",
  "book": false,
  "note": "日程のエリア外の例",
  "url": "",
  "created": 1790000000005
 },
 "trips/sample-kyoto/items/i01": {
  "date": "2027-04-02",
  "time": "09:00",
  "kind": "move",
  "title": "新幹線で名古屋 → 京都",
  "note": "",
  "spotId": "",
  "order": 1,
  "arrive": "09:35"
 },
 "trips/sample-kyoto/items/i02": {
  "date": "2027-04-02",
  "time": "10:30",
  "kind": "see",
  "title": "清水寺",
  "note": "",
  "spotId": "kiyomizu",
  "order": 2
 },
 "trips/sample-kyoto/items/i03": {
  "date": "2027-04-02",
  "time": "夕方",
  "kind": "see",
  "title": "祇園の街歩き",
  "note": "",
  "spotId": "gion",
  "order": 3
 },
 "trips/sample-kyoto/items/i04": {
  "date": "2027-04-03",
  "time": "08:00",
  "kind": "see",
  "title": "竹林の小径",
  "note": "",
  "spotId": "bamboo",
  "order": 1
 },
 "trips/sample-kyoto/items/i05": {
  "date": "2027-04-03",
  "time": "14:00",
  "kind": "see",
  "title": "金閣寺",
  "note": "",
  "spotId": "kinkaku",
  "order": 2
 },
 "trips/sample-kyoto/items/i06": {
  "date": "2027-04-04",
  "time": "09:30",
  "kind": "see",
  "title": "伏見稲荷大社",
  "note": "",
  "spotId": "fushimi",
  "order": 1
 },
 "trips/sample-kyoto/items/i07": {
  "date": "2027-04-04",
  "time": "16:00",
  "kind": "move",
  "title": "新幹線で京都 → 名古屋",
  "note": "",
  "spotId": "",
  "order": 2,
  "arrive": "16:35"
 }
};
