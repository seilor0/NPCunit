import {xor, addRow, batchMove} from '../_utility/function.js'

/**
 * CoC6/7版のフラグ管理用変数
 * @type {Boolean} 6版:true, 7版:false
 */
let coc6th = true;

/**
 * 技能テーブル用の情報を格納しておくリスト
 * @type {Array}
 * @type 判定の種類\n
 *  - choice : チョイス
 *  - roll : 通常の判定
 *  - dice : 1d3など、振るダイスが直接記述されているもの
 *  - elseRoll : 対抗ロール・正気度ロールなど、判定だが振るダイスが直接記述されているもの
 *  - line : :HP+1, /scene, @face など、そのままチャットに送るもの
 * @name 技能名
 * @value 技能値・判定部分のテキスト
 * @times **繰り返す回数
 * @noname **技能名をチャパレに表示しない設定
*/
let skillList = [];

/**
 * チャパレ用の情報を格納しておくリスト
 * @type {Array}
 * @type 判定の種類\n
 *  - choice : チョイス
 *  - roll : 通常の判定
 *  - dice : 1d3など、振るダイスが直接記述されているもの
 *  - elseRoll : 対抗ロール・正気度ロールなど、判定だが振るダイスが直接記述されているもの
 *  - line : セパレータ, :HP+1, /scene, @face など、そのままチャットに送るもの
 * @name 技能名
 * @value 技能値・判定部分のテキスト
 * @times **繰り返す回数
 * @checked **除外チェックボックスのON/OFF設定
 * @noname **技能名をチャパレに表示しない設定
 */
let chatList = [];


// left col
const colorEl        = document.getElementById('color');
const namePreviewEl  = document.getElementsByClassName('ccfoliaName')[0];
const unitSizeEl     = document.getElementById('unitSize');
const memoEl         = document.getElementById('memo');
const diffEl         = document.getElementById('diff');

// middle col
const statsEl   = document.getElementById('stats');
const skillsEl  = document.getElementById('skills');

// Table
const addParamsTable = document.querySelector('#addParamsTable tbody');
const addStatsTable  = document.querySelector('#addStatsTable tbody');
const paramsTable    = document.querySelector('#paramsTable tbody');
const statsTable     = document.querySelector('#statsTable tbody');
const elseTable      = document.querySelector('#elseTable tbody');
const skillTable     = document.querySelector('#skillTable tbody');
const chatTable      = document.querySelector('#chatTable tbody');

statsEl.placeholder = 
`STR 8 ... EDU 15
HP 12  MP 30  SAN 10  DB +1D4
アイデア 75  幸運 60  知識 75`;
skillsEl.placeholder = 
`・目星70% 聞き耳40% 図書館25%
・CCB<=50 こぶし（パンチ）
・1d4+db/2
・キック　50% / 1d6+db / 1R1回

・チョイス
・対抗ロール
・組み合わせロール
・繰り返しロール
・@○○
・スラッシュコマンド（/scene etc.）
・コマンド（:HP+1）`;


const dragEvent = {dragStart:dragStart, drop:drop};
addRow(addParamsTable,2, 0, dragEvent, true);
addRow(addStatsTable, 3, 0, dragEvent, true);


document.getElementById('separater').addEventListener('click', () => {
  const bulkInputElement = document.getElementById('bulkInput');
  const base  = bulkInputElement.value;
  const stPos = bulkInputElement.selectionStart;
  const edPos = bulkInputElement.selectionEnd;
  const insertStr = (stPos==0 || base.substr(stPos-1,1)=='\n' ? '' : '\n')
  + '==============='
  + (edPos==base.length || base.substr(edPos, 1)=='\n' ? '' : '\n');

  bulkInputElement.value = base.substr(0,stPos) + insertStr + base.substr(edPos);
  bulkInputElement.focus();
  bulkInputElement.setSelectionRange(stPos+insertStr.length, stPos+insertStr.length);
});

document.getElementById('input').addEventListener('click', () => {
  const arr = document.getElementById('bulkInput').value.split(/\n?===============\n?/);
  if (arr.length>2)  memoEl.value = arr.at(-3).trim();
  statsEl.value = arr.length>1 ? arr.at(-2).trim() : '';
  skillsEl.value = arr.at(-1).trim();

  memoEl.dispatchEvent(new Event('change'));
  statsEl.dispatchEvent(new Event('change'));
  skillsEl.dispatchEvent(new Event('change'));
});


statsEl.addEventListener('change', updateValueTables);
statsEl.addEventListener('change', createChatList);
skillsEl.addEventListener('change', createSkillList);
skillsEl.addEventListener('change', createChatList);

statsEl.addEventListener( 'input', updateValueTables);
skillsEl.addEventListener('input', createSkillList);

// import ccfolia unit
document.getElementById('ccfoUnit').addEventListener('change', importUnit);

// 名前
memoEl.addEventListener('change', e => 
  namePreviewEl.innerText = e.currentTarget.value.split('\n')[0] || '探索者名'
);

// コマサイズ
unitSizeEl.addEventListener('input', (e)=>e.currentTarget.nextElementSibling.value = e.currentTarget.value);
unitSizeEl.nextElementSibling.addEventListener('input', (e)=>unitSizeEl.value = e.currentTarget.value);

// 発言色
colorEl.addEventListener('input', (e) => {
  colorEl.nextElementSibling.value = e.currentTarget.value;
  namePreviewEl.style.color = e.currentTarget.value;
});
colorEl.nextElementSibling.addEventListener('input', (e) => {
  if (!/^#?[0-9a-fA-F]{6}$/.test(e.currentTarget.value)) return;
  const color = (e.currentTarget.value.charAt(0)=='#'?'':'#') + e.currentTarget.value;
  colorEl.value = color;
  namePreviewEl.style.color = color;
});

// 差分
diffEl.addEventListener('change', () => {
  if(document.querySelector('[name=chatTarget] [value=diff]').checked) createChatList();
});

// sDice,sChoice
document.getElementById('sDice').addEventListener  ('click', updateChat);
document.getElementById('sChoice').addEventListener('click', updateChat);

// system
document.getElementById('system').addEventListener('change', (e) => {
  coc6th = !e.currentTarget.checked;
  updateValueTables();
  createChatList();
});

// 消去する文字
document.getElementById('delChar').addEventListener('change', () => {
  updateValueTables();
  createSkillList();
  createChatList();
});

// ダイス設定
document.getElementById('dice').addEventListener('change', updateChat);
document.getElementById('dice').addEventListener('change', (e) => {
  const dice = e.currentTarget.value;
  document.getElementById('dice2').children[0].textContent = dice+'<=70 【...】';
  document.getElementById('dice2').children[1].textContent = 's'+dice+'<=70 【...】';
  document.getElementById('dice2').children[2].textContent = dice+' 【...】@70';
});
document.getElementById('dice2').addEventListener('change', updateChat);

// チャットターゲット
document.querySelectorAll('[name=chatTarget] input[type=checkbox]').forEach(input => input.addEventListener('change', createChatList));

// テーブル：✔切り替え
[...paramsTable.children].forEach(row => row.addEventListener('click', (e) => {
  toggleSecretCheckbox(e);
  const i = chatList.findIndex(el=>el.name.startsWith(e.currentTarget.children[1].innerText));
  if (i>-1)  batchMove(chatTable.children[i],'↓↓').checked = batchMove(e.currentTarget,'↓↓').checked;
}));
[...statsTable.children].forEach(row => row.addEventListener('click', (e) => {
  toggleSecretCheckbox(e);
  if (e.currentTarget.children[1].innerText=='SAN') {
    const i = chatList.findIndex(el=>String(el.value).startsWith('1d100<={SAN}'));
    if (i>-1)  batchMove(chatTable.children[i],'↓↓').checked = batchMove(e.currentTarget,'↓↓').checked;
  }
}));

// パラメータ・ステータス追加
document.getElementById('addParam').addEventListener('click', ()=>addRow(addParamsTable, 2, 0, dragEvent, true));
document.getElementById('addStat').addEventListener ('click', ()=>addRow(addStatsTable,  3, 0, dragEvent, true));
document.getElementById('delParam').addEventListener('click', ()=>addParamsTable.lastElementChild.remove());
document.getElementById('delStat').addEventListener ('click', ()=>addStatsTable.lastElementChild.remove());

// copy to Clipboard
document.getElementById('exUnit').addEventListener('click', exportUnit);
document.getElementById('exChat').addEventListener('click', (e)=>copy2clipboard(e.currentTarget, getChatpalette()));


// ----------------------------
//          メイン処理
// ----------------------------

function updateValueTables () {
  console.log('❚ updateValueTables');
  let text = statsEl.value.replaceAll(/　/g,' ').replace(/\n/g,'');
  text = text.replace(/[！-｝]/g, function(s){return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);});
  
  // 能力値
  const props = new Map();
  ['STR','CON','POW','DEX','APP','SIZ','INT','EDU'].forEach(key =>
    props.set(key, parseInt(text.match(new RegExp(`${key}\\W*(\\d+)`,'i'))?.[1]) || null)
  );
  // DB
  props.set('DB', text.match(/(?:DB|ダメージ・?ボーナス)\W*([-D\d]+)/i)?.[1].toLowerCase() || null);
  if(!props.get('DB') && props.get('STR') && props.get('SIZ')) {
    const sum = (props.get('STR') + props.get('SIZ')) / (coc6th ? 1 : 5);
    if      (sum<=16)           props.set('DB', '-1d4');
    else if (sum>16 && sum<=24) props.set('DB', 0);
    else if (sum>24 && sum<=32) props.set('DB', '1d4');
    else if (sum>32 && sum<=40) props.set('DB', '1d6');
    else if (sum>40 && sum<=48) props.set('DB', '2d6');
  }

  props.values().forEach((value,i) => paramsTable.children[i].lastElementChild.textContent = value);

  // HP・MP・SAN
  let hp  = parseInt(text.match(/(?:HP|耐久力?)\D*(\d+)/i)?.[1]) || null;
  if (!hp && props.get('CON') && props.get('SIZ')) {
    hp = coc6th ? Math.ceil((props.get('CON')+props.get('SIZ'))/2) : Math.floor((props.get('CON')+props.get('SIZ'))/10);
  }
  const mp  = parseInt(text.match(/(?:MP|マジック・?ポイント)\D*(\d+)/i)?.[1]) || props.get('POW')/(coc6th?1:5) || null;
  const san = parseInt(text.match(/(?:SAN値?|正気度)\D*(\d+)/i)?.[1])         || props.get('POW')*(coc6th?5:1) || null;

  statsTable.children[0].lastElementChild.innerText = hp;
  statsTable.children[1].lastElementChild.innerText = mp;
  statsTable.children[2].lastElementChild.innerText = san;

  // アイデア・幸運・知識
  const ide  = parseInt(text.match(/(?:ID[AE]|アイディ?ア)\D*(\d+)/i)?.[1]) || props.get('INT')*(coc6th?5:1) || null;
  const luck = parseInt(text.match(/(?:LUCK|幸運)\D*(\d+)/i)?.[1]) || (props.get('POW')&&coc6th ? props.get('POW')*5 : null);
  const know = parseInt(text.match(/(?:KNOW|知識)\D*(\d+)/i)?.[1]) || props.get('EDU')*(coc6th?5:1) || null;
  
  elseTable.children[0].lastElementChild.innerText = ide;
  elseTable.children[1].lastElementChild.innerText = luck;
  elseTable.children[2].lastElementChild.innerText = know;

  return;
}


function createSkillList () {
  console.log('❚ createSkillList');
  skillList = [];

  // (?({?DB}?|\d+D\d+|\d+|{.+?}))?
  const b = '\\(?(?:\\{?DB\\}?|\\d+D\\d+|\\d+|\\{.+?\\})\\)?';  // db,1d3,2,{...}
  const dicePattern = `${b}(?:[-+*/]${b})*`;
  
  // skillList 作成
  const baseArr = normStr(skillsEl.value).split(/\n|%/).filter(Boolean);
  baseArr.forEach(base => {
    let dic, times;

    // 複数回ロール
    if (/^(?:x|rep|repeat)\d+/.test(base)) {
      times = parseInt(base.match(/^(?:x|rep|repeat)(\d+)/i)[1]);
      base = base.replace(/(?:x|rep|repeat)\d+ */i,'');
    }
    
    // ---------------------
    
    // command
    if (/^@|^:|^\/(?:scene|save|load|pdf|var|play|roll-table|omikuji)/i.test(base)) {
      dic = {type:'line', name:'', value:base};

    // choice
    } else if (base.indexOf('choice') > -1) {
      const choice = base.match(/choice\d*(?:\[.+\]|\(.+\)| .+)/i)?.[0];
      if (!choice) return;
      dic = {type:'choice', name:base.replace(choice,''), value:choice};

    } else if (base.indexOf('チョイス') > -1) {
      const arr = base.match(/チョイス(\d*) *(.+)/i);
      if (!arr) return;
      const [choice, cTimes, option] = arr.slice(0,3);
      const value = `choice${cTimes}[${option.split(/[,、， ]/).filter(Boolean).join(',')}]`;
      dic = {type:'choice', name:base.replace(choice,''), value:value};

    // 組み合わせロール
    } else if (/CBR/i.test(base)) {
      const [value,value1,value2] = base.match(/CBRB?\D*(\d+)\D+(\d+)\)?/i).slice(0,3);
      dic = {type:'elseRoll', name:base.replace(value,''), value:`CBR(${value1},${value2})`};
      
    // 対抗ロール
    } else if (/RES/i.test(base)) {
      const [value,value1,value2] = base.match(/RESB?\D*(\d+)\D+(\d+)\)?/i).slice(0,3);
      dic = {type:'elseRoll', name:base.replace(value,''), value:`RES(${value1}-${value2})`};

    // CCB<=70 skill
    } else if (/(?:1d100|CCB?)<=/i.test(base)) {
      const arr = base.match(new RegExp(`<=(${dicePattern}) *(.*)`,'i'));
      dic = {type:'roll', name:arr[2], value:arr[1]};
      
    // CCB skill @70
    } else if (/(?:1d100|CCB?).*@\d+$/i.test(base)) {
      const arr = base.match(/(?:1d100|CCB?) *(.*) *@(\d+)$/i);
      dic = {type:'roll', name:arr[1], value:arr[2]};

    // 1d3
    } else if (/\dD\d/i.test(base)) {
      let value = base.match(new RegExp(dicePattern,'i'))[0];
      const name = base.replace(value,'');
      value = value.replace(/\/1$/i,'').replace(/\{?db\}?/gi,'{DB}');
      dic = {type:'dice', name:name, value:value};

    // skill 70
    } else {
      const arr = base.match(new RegExp(`(.*?)(${dicePattern})\\D*$`,'i'));
      if (!arr) {
        console.log(`Not add to chat-palette : ${base}`);
        return;
      }
      dic = {type:'roll', name:arr[1], value:arr[2]};
    }

    if(times)  dic.times = times;
    dic.name = dic.name.replace(/[()]/g, function(s){return String.fromCharCode(s.charCodeAt(0) + 0xFEE0);}).trim();
    skillList.push(dic);
  });


  // skillTableの更新
  skillTable.innerHTML='';
  if (!skillList.length) {
    for (let i=0; i<6; i++) {
      const row = addRow(skillTable, 2, 0);
      row.style.height = '1.5rem';
    }
  }
  skillList.forEach(dic => {
    const row = addRow(skillTable, 2, 0);
    row.children[0].innerText = (dic.times ? `x${dic.times} ` : '') + dic.name;
    row.children[1].innerText = dic.value;

    // 技能名をクリックでチャット欄の技能名表示を切り替える
    // skillListとchatListで参照しているdicが同じなため、skillListだけ切り替えればOK
    row.children[0].addEventListener('click', (e) => {
      const i = e.currentTarget.parentElement.rowIndex;
      if (e.currentTarget.style.color) {
        e.currentTarget.style.color = null;
        e.currentTarget.style.textDecoration = null;
        skillList[i].noname = false;
      } else {
        e.currentTarget.style.color = 'rgb(0 0 0 /0.33)';
        e.currentTarget.style.textDecoration = 'line-through';
        skillList[i].noname = true;
      }
      updateChat();
    });
  });
}


function createChatList() {
  chatList = [];
  
  // chatList 作成
  const chatTargets = Array.from(document.querySelectorAll('[name=chatTarget] input:checked'), el=>el.value);
  chatTargets.forEach(chatTarget => {
    switch (chatTarget) {
      // 差分
      case 'diff':
        if (!diffEl.value)  break;
        diffEl.value.split('\n').filter(Boolean).forEach(diff => {chatList.push({type:'line', name:'', value:diff})});
        chatList.push({type:'line', name:'', value:'==========='});
        break;

      // 正気度ロール
      case 'sanc':
        if(!statsTable.children[2].lastElementChild.innerText)  break;
        const dic = {type:'elseRoll', name:'正気度ロール', value:'1d100<={SAN}'};
        if (batchMove(statsTable.children[2],'↓↓').checked)  dic.checked=true;
        chatList.push(dic);
        break;

      // アイデア・幸運・知識
      case 'ide':
        [...elseTable.children].forEach(row => {
          const value = row.lastElementChild.innerText;
          if(value) chatList.push({type:'roll', name:row.firstElementChild.innerText, value:value});
        })
        if (coc6th) break;
        const i = chatList.findIndex(e => e.name=='幸運');
        if (i>-1)  chatList[i].value='{幸運}';
        break;

      // 技能・判定
      case 'skill':
        chatList = chatList.concat(skillList);
        break;

      // 倍数ロール
      case 'stats':
        if ([...paramsTable.children].slice(0,8).filter(e => e.lastElementChild.innerText).length>0) {
          chatList.push({type:'line', name:'', value:'==========='});
        }
        [...paramsTable.children].slice(0,8).forEach(row => {
          const value = row.lastElementChild.innerText;
          if(value) {
            const key = row.children[1].innerText;
            const dic = {type:'roll', name:`${key}${coc6th?'*5':''}`, value:`{${key}}${coc6th?'*5':''}`};
            if(batchMove(row,'↓↓').checked) dic.checked=true;
            chatList.push(dic);
          }
        });
        break;
    }
  })
  console.log('❚ createChatList\n', chatList);

  // chatTableに反映
  chatTable.innerHTML = '';

  if (!chatList.length) {
    for (let i=0; i<17; i++) {
      const row = addRow(chatTable,3);
      row.style.height = '1.5rem';
    }
  }

  for (let i=0; i<chatList.length; i++) {
    const row = addRow(chatTable, 3, -1, {dragStart:dragStart, drop:[drop,dropAdd]});
    const cell1 = row.children[0];
    const cell2 = row.children[1];
    const cell3 = row.children[2];
  
    const rCheck = document.createElement('input');
    const sCheck = document.createElement('input');
    rCheck.type = 'checkbox';
    sCheck.type = 'checkbox';
    cell1.appendChild(rCheck);
    cell2.appendChild(sCheck);
  
    cell2.addEventListener('click', () => {
      const text = cell3.innerText;
      cell3.innerText = text.charAt(0)=='s' ? text.substring(1,) : `s${text}`;
    });
    cell3.addEventListener('click',toggleSecretCheckbox);
  };

  updateChat();
  return;
}


function updateChat() {
  console.log('❚ updateChat');
  
  const dice  = document.getElementById('dice').value;
  const dice2 = document.getElementById('dice2').value;

  chatList.forEach((dic,i) => {
    const name = !dic.noname&&dic.name ? ` 【${dic.name}】` : '';
    const times = dic.times ? `x${dic.times} ` : '';
    const secret = chatTable.children[i].children[1].firstElementChild.checked;
    const cell3  = chatTable.children[i].lastElementChild;
  
    if (dice2=='@'&&/STR|CON|POW|DEX|APP|SIZ|INT|EDU/.test(dic.value)) {
      const key = dic.value.match(/\{(.*)\}/)[1];
      const val = parseInt(Array.from(paramsTable.children).filter(e => e.children[1].innerText==key)[0].lastElementChild.innerText);
      cell3.innerText = `${times}${secret ? 's' : ''}${dice}${name} @${val*(coc6th?5:1)}`;
      return;
    }
  
    if (dice2=='@'&&dic.name=='幸運'&&!coc6th) {
      const luck = elseTable.children[1].lastElementChild.innerText;
      cell3.innerText = `${times}${secret ? 's' : ''}${dice}${name} @${luck}`;
      return;
    }
  
    switch (dic.type) {
      case 'line':
        cell3.innerText = times + dic.value;
        break;
      case 'dice':
        cell3.innerText = times + (xor(document.getElementById('sDice').checked,secret) ? 's' : '') + dic.value + name;
        break;
      case 'choice':
        cell3.innerText = times + (xor(document.getElementById('sChoice').checked,secret) ? 's' : '') + dic.value + name;
        break;
      case 'elseRoll':
        if      (dice=='CC')  dic.value = dic.value.replace(/(CBR|RES)B/i,'$1');
        else if (dice=='CCB') dic.value = dic.value.replace(/(CBR|RES)([^B])/i,'$1B$2');
        cell3.innerText = times + (xor(dice2=='s',secret) ? 's' : '') + dic.value + name;
        break;
      case 'roll':
        if (dice2=='@') cell3.innerText = `${times}${secret ? 's' : ''}${dice}${name} @${dic.value}`;
        else            cell3.innerText = `${times}${xor(dice2=='s',secret) ? 's' : ''}${dice}<=${dic.value}${name}`;
        break;
    }
  });
  return;
}


function initialize () {
  importedUnit = '';
  
  document.getElementById('bulkInput').value = '';
  memoEl.value  = '';
  diffEl.value  = '';
  namePreviewEl.innerText = '探索者名';

  document.getElementById('delChar').value = ' :…「」『』【】〈〉\\[\\]《》≪≫';

  colorEl.value = '#888888';
  colorEl.nextElementSibling.value = '#888888';
  namePreviewEl.style.color = '#888888';

  // unitSizeEl.value = 4;
  // unitSizeEl.nextElementSibling.value = 4;

  // document.getElementById('secret').checked     = false;
  // document.getElementById('invisible').checked  = false;
  // document.getElementById('hideStatus').checked = false;

  statsEl.value    = '';
  skillsEl.value   = '';
  document.getElementById('ccfoUnit').value = '';

  [...paramsTable.children].forEach(e => batchMove(e,'↓↓').checked = false);
  [...statsTable.children].forEach (e => batchMove(e,'↓↓').checked = false);
  
  addParamsTable.innerHTML = '';
  addStatsTable.innerHTML  = '';
  addRow(addParamsTable, 2, 0, dragEvent, true);
  addRow(addStatsTable,  3, 0, dragEvent, true);

  updateValueTables();
  createSkillList();
  createChatList();
}


let importedUnit;
function importUnit (e) {
  console.log('❚ importUnit');
  if (!e.currentTarget.value)  return;
  let unit = JSON.parse(e.currentTarget.value);
  if (unit.kind=='encoded')  unit = JSON.parse(decodeURIComponent(atob(unit.data)));
  if (unit.kind!='character')  return;
  
  initialize();
  importedUnit = unit.data;
  console.log('imported unit : \n', importedUnit);

  // name & memo
  memoEl.value = (importedUnit.name || '') + (importedUnit.memo ? `\n${importedUnit.memo}` : '');
  namePreviewEl.innerText = importedUnit.name;

  // color
  if (importedUnit.color) {
    colorEl.value = importedUnit.color.toLowerCase();
    colorEl.nextElementSibling.value = importedUnit.color.toLowerCase();
    namePreviewEl.style.color = importedUnit.color;
  }
  // unit size
  if (importedUnit.width) {
    unitSizeEl.value = importedUnit.width;
    unitSizeEl.nextElementSibling.value = importedUnit.width;
  }
  // unit setting
  document.getElementById('secret').checked     = importedUnit.secret;
  document.getElementById('invisible').checked  = importedUnit.invisible;
  document.getElementById('hideStatus').checked = importedUnit.hideStatus;

  // face
  if (importedUnit.faces)  diffEl.value = importedUnit.faces.map(e => e.label).filter(Boolean).join('\n');

  // params, status
  statsEl.value = '';
  addParamsTable.innerHTML = '';
  addStatsTable.innerHTML  = '';
  if (importedUnit.params) {
    statsEl.value += importedUnit.params.map(e => `${e.label}  ${e.value}`).join('\t')+'\n';
    const extraParams = importedUnit.params.filter(e => !/STR|CON|POW|DEX|APP|SIZ|INT|EDU|DB/.test(e.label));
    if (extraParams.length) {
      for (let param of extraParams) {
        const row = addRow(addParamsTable, 2, 0, dragEvent, true);
        row.firstElementChild.innerText = param.label;
        row.lastElementChild.innerText  = param.value;
      }
    } else addRow(addParamsTable, 2, 0, dragEvent, true);
  }
  if (importedUnit.status) {
    statsEl.value += importedUnit.status.map(e => `${e.label}  ${e.max||e.value}`).join('\t');
    const extraStats = importedUnit.status.filter(e => !/HP|MP|SAN|幸運/.test(e.label));
    if (extraStats.length) {
      for (let stat of extraStats) {
        const row = addRow(addStatsTable, 3, 0, dragEvent, true);
        row.firstElementChild.innerText = stat.label;
        row.children[1].innerText       = stat.value;
        if (stat.max)  row.lastElementChild.innerText = stat.max;
      }
    } else  addRow(addStatsTable, 3, 0, dragEvent, true);
  }
  
  // commands
  {
    const arr = [];
    let matchArr = importedUnit.commands.match(/(\d+).*アイディ?ア|アイディ?ア.*@(\d+)/);
    if(matchArr) arr.push(`アイデア  ${matchArr[1]||matchArr[2]}`);

    matchArr = importedUnit.commands.match(/(\d+).*幸運|幸運.*@(\d+)/);
    if(matchArr) arr.push(`幸運  ${matchArr[1]||matchArr[2]}`);
    
    matchArr = importedUnit.commands.match(/(\d+).*知識|知識.*@(\d+)/);
    if(matchArr) arr.push(`知識  ${matchArr[1]||matchArr[2]}`);

    statsEl.value += (arr.length ? '\n' : '') + arr.join('\t');
  }

  const replaceArr = [[/^.*<=\{.*\}.*$/mg, ''], [/^.*(?:アイディ?ア|幸運|知識).*$/mg, ''], [' ', '_']];
  skillsEl.value = replaceArr.reduce((result,i)=>result=result.replaceAll(i[0],i[1]), importedUnit.commands).trim();

  updateValueTables();
  createSkillList();
  createChatList();
}


// ----------------------------
//             関数
// ----------------------------

// calc
function normStr(str) {
  str = str.replaceAll(/　/g,' ');
  str = str.replace(/[！-｝]/g, function(s){return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);});
  str = str.replace(new RegExp(`[${document.getElementById('delChar').value}]`,'g'),'');
  str = str.replace(/_/g,' ');
  return str;
}

// EventListener
function toggleSecretCheckbox (e)  {
  const input = batchMove(e.target,'↑↓↓');
  input.checked = !input.checked;
}

function dragStart (e) {
  e.dataTransfer.setData('text/plain', e.currentTarget.rowIndex-1)
}

function drop (e) {
  e.currentTarget.classList.remove('target');
  const startIndex = parseInt(e.dataTransfer.getData('text/plain'));
  e.currentTarget.before(e.currentTarget.parentElement.children[startIndex]);
}

function dropAdd (e) {
  const startIndex = parseInt(e.dataTransfer.getData('text/plain'));
  const startDic = chatList[startIndex];
  const dropIndex  = e.currentTarget.rowIndex-2;
  chatList.splice(startIndex,1);
  chatList.splice(dropIndex, 0, startDic);
}

// else
function getChatpalette() {
  return [...chatTable.children].filter((e) => !e.firstElementChild.firstElementChild.checked).map((e) => e.lastElementChild.innerText).join('\n');
}

function exportUnit(event) {
  let unit = jsonTemplate = { kind: 'character',
    data: {
      name: memoEl.value.split('\n')[0] ,
      initiative: parseInt(paramsTable.children[3].lastElementChild.innerText) || 0,
      width: parseInt(unitSizeEl.value),
      color: colorEl.value,
      memo:  '',
      commands: getChatpalette(),
      params: [],
      status: [],
      faces:  [],
      secret:     document.getElementById('secret').checked,
      invisible:  document.getElementById('invisible').checked,
      hideStatus: document.getElementById('hideStatus').checked
    }
  };

  // memo
  if (memoEl.value.trim().split('\n').length>1) {
    unit.data.memo = memoEl.value.trim().replace(/^.+\n/,'').trim();
  }
  
  // params
  [...paramsTable.children].filter((e)=>!e.firstElementChild.firstElementChild.checked).forEach(row => {
    if (row.lastElementChild.innerText) {
      unit.data.params.push({label:row.children[1].innerText, value:row.lastElementChild.innerText});
    }
  });
  for (let row of addParamsTable.children) {
    const label = row.firstElementChild.innerText;
    const val   = row.lastElementChild.innerText;
    if (label || val)  unit.data.params.push({label:label, value:val});
  };

  // stats
  [...statsTable.children].filter((e)=>!e.firstElementChild.firstElementChild.checked).forEach(row => {
    const val = parseInt(row.lastElementChild.innerText);
    if (val)  unit.data.status.push({label:row.children[1].innerText, value:val, max:val});
  });
  if (!coc6th) {
    let luck = parseInt(elseTable.children[1].lastElementChild.innerText);
    if (luck)  unit.data.status.push({label:'幸運', value:luck, max:luck});
  }
  [...addStatsTable.children].forEach(row => {
    const label  = row.firstElementChild.innerText;
    const val    = parseInt(row.children[1].innerText);
    const maxVal = parseInt(row.lastElementChild.innerText);
    if (label || val) {
      unit.data.status.push( maxVal ? {label:label, value:val, max:maxVal} : {label:label, value:val} );
    }
  });

  // faces
  if (diffEl.value)  diffEl.value.split('\n').forEach(row => unit.data.faces.push({iconUrl:null, label:row}));

  // externalURL
  if (importedUnit?.data.externalUrl)  unit.data.externalUrl = importedUnit.data.externalUrl;
  // icon
  if (importedUnit?.data.iconUrl)  unit.data.iconUrl = importedUnit.data.iconUrl;
  // face-icon
  if (importedUnit?.data.faces) {
    importedUnit.data.faces.forEach(face => {
      const i = unit.data.faces.findIndex(e => e.label==face.label);
      if(i>-1) unit.data.faces[i].iconUrl = face.iconUrl;
    });
  }
  console.log(unit);
  copy2clipboard(event.currentTarget, JSON.stringify(unit));
}

function copy2clipboard(element, text) {
  const defText = element.innerText;
	navigator.clipboard.writeText(text);
	element.innerText = 'Copied!';
	setTimeout(() => element.innerText=defText, 1000);
}
