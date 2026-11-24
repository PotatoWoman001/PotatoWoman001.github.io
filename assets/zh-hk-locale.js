/*
 * JOTO Global — Hong Kong Traditional Chinese (zh-HK) presentation layer.
 *
 * Pages under /zh-hk/ reuse the Simplified Chinese (zh-CN) content of the site
 * and are rendered in Hong Kong Traditional Chinese by this script:
 *   1. exact-string overrides reviewed by the Hong Kong team (OVERRIDES),
 *   2. Hong Kong wording phrase rules (PHRASES),
 *   3. Simplified → Traditional character mapping (CHARS).
 * Protected names (legal entity names, ICP filing numbers) are never reworded.
 *
 * Loaded as a classic (non-module) script in the <head> of /zh-hk/ pages so the
 * observer is installed before the application renders. Also usable from Node
 * (module.exports) by the integration and verification scripts.
 */
(function (root) {
  "use strict";

  // Simplified → Traditional (Hong Kong forms). Only characters that differ.
  var S =
    "沪备号国续采购与墙为维订术换务阅块际学东苏云费统关网约许连凯项跃员个园区络经销刚实验线无级产点机确认开导体顿创颇尔过滤资视驱动让复杂构业环结帮简运营并断扩评优归单讨论现边缘顺畅见础办户从发设审规划组联键应访问将广减两链识转变训拟钓鱼风险踪进计报状护贯处围绕响间检测数据协随盖闭终适贴胁径语则迁时权给录证账来蓝图储虚负载于准华库长别压释潜选择话质绪稳灵继码织对讲场厂声听争频触达众练门汇传监记读凭楼纳决们讯韧专团队类态层紧调询战后综装种热驻践属软饮电筹领执范诺谢里伦诉请会议说题谈当总拨邮标么输顶页脚获赖职责还况绍暂试这启扑档远满财强余粤湾怀仓扫枪摄独叠够渐预临难谜须谁阶带宽柜没参却离缩异马画买缓价该隐绿显琐错觉货槛纸书骤写冻样编节乱师游败签较轮严几钟侧误击拥观义称册犹补荐横逻辑齐红译双头针盘纯遥仪万栋筑礼馈庞仅舍挥锁岗谨筛淀沟遗势顾纵灾旧扬气烟览轴饰晕张条黄盗内“”‘’亚欧爱罢摆宝饱贝笔币毕宾蚕惭残偿车彻陈衬惩迟齿冲虫丑疮闯锤词辞聪丛窜贷担胆弹挡党岛祷灯邓敌递垫赌锻吨夺堕恶饿儿饵贰罚阀饭纺飞废纷坟奋粪丰疯冯缝讽凤肤辐抚辅赋妇缚钙赶秆赣冈钢纲搁鸽阁巩贡馆惯龟贵滚锅骇韩汉轰坏欢唤焕痪谎辉毁绘浑祸积饥迹鸡绩极挤纪夹贾驾坚歼艰俭拣剑鉴舰浆奖酱胶浇骄娇搅矫饺缴绞轿洁诫届锦晋尽劲茎惊鲸颈镜竞净纠举惧剧锯诀绝军骏颗壳课垦恳裤夸矿旷亏窥溃阔蜡腊莱栏拦篮兰澜揽懒缆烂滥捞劳乐垒泪丽厉励历沥隶俩莲怜帘敛脸恋炼粮凉辆谅疗辽猎邻赁龄铃岭刘龙聋笼垄拢搂芦卢颅庐炉卤鲁陆驴吕铝侣屡缕虑抡沦萝罗骆妈玛骂吗麦卖迈脉瞒蛮猫锚贸镁闷梦弥绵庙灭闽鸣铭谬谋亩钠脑恼闹酿鸟镍柠宁拧钮纽浓农殴呕赔喷鹏骗飘贫苹泼铺朴谱凄骑岂弃牵铅谦钱钳浅谴抢桥乔侨翘窍窃钦亲寝轻氢倾顷庆琼穷趋躯劝饶扰荣绒锐润洒萨赛伞丧骚涩杀纱晒闪陕伤赏烧绅肾渗绳胜圣狮湿诗尸蚀驶寿兽枢赎树竖帅税硕烁丝饲耸颂诵肃虽岁孙损摊贪瘫滩坛谭叹汤烫涛腾铁厅铜颓驼袜弯顽韦违伟伪纬谓卫闻纹窝呜乌诬吴雾锡牺袭习戏细虾辖峡侠狭厦吓鲜纤贤衔闲献县馅羡宪厢乡详晓携谐泻锌兴锈绣轩悬寻驯逊鸭哑盐颜艳厌谚杨阳痒养摇谣药爷叶医蚁艺亿忆谊荫阴银樱婴鹰莹萤蝇赢颖佣咏涌忧诱舆渔娱屿狱誉渊圆愿钥岳匀陨蕴韵赞凿枣灶泽贼赠轧闸诈斋债斩崭栈绽涨帐胀赵辙贞侦诊镇阵挣帧郑挚掷帜肿皱昼猪诸烛瞩嘱贮铸砖赚桩庄妆壮锥坠浊钻";
  var T =
    "滬備號國續採購與牆為維訂術換務閱塊際學東蘇雲費統關網約許連凱項躍員個園區絡經銷剛實驗線無級產點機確認開導體頓創頗爾過濾資視驅動讓復雜構業環結幫簡運營並斷擴評優歸單討論現邊緣順暢見礎辦戶從發設審規劃組聯鍵應訪問將廣減兩鏈識轉變訓擬釣魚風險蹤進計報狀護貫處圍繞響間檢測數據協隨蓋閉終適貼脅徑語則遷時權給錄證賬來藍圖儲虛負載於準華庫長別壓釋潛選擇話質緒穩靈繼碼織對講場廠聲聽爭頻觸達眾練門匯傳監記讀憑樓納決們訊韌專團隊類態層緊調詢戰後綜裝種熱駐踐屬軟飲電籌領執範諾謝裏倫訴請會議說題談當總撥郵標麼輸頂頁腳獲賴職責還況紹暫試這啟撲檔遠滿財強餘粵灣懷倉掃槍攝獨疊夠漸預臨難謎須誰階帶寬櫃沒參卻離縮異馬畫買緩價該隱綠顯瑣錯覺貨檻紙書驟寫凍樣編節亂師遊敗簽較輪嚴幾鐘側誤擊擁觀義稱冊猶補薦橫邏輯齊紅譯雙頭針盤純遙儀萬棟築禮饋龐僅捨揮鎖崗謹篩澱溝遺勢顧縱災舊揚氣煙覽軸飾暈張條黃盜內「」『』亞歐愛罷擺寶飽貝筆幣畢賓蠶慚殘償車徹陳襯懲遲齒衝蟲醜瘡闖錘詞辭聰叢竄貸擔膽彈擋黨島禱燈鄧敵遞墊賭鍛噸奪墮惡餓兒餌貳罰閥飯紡飛廢紛墳奮糞豐瘋馮縫諷鳳膚輻撫輔賦婦縛鈣趕稈贛岡鋼綱擱鴿閣鞏貢館慣龜貴滾鍋駭韓漢轟壞歡喚煥瘓謊輝毀繪渾禍積飢跡雞績極擠紀夾賈駕堅殲艱儉揀劍鑒艦漿獎醬膠澆驕嬌攪矯餃繳絞轎潔誡屆錦晉盡勁莖驚鯨頸鏡競淨糾舉懼劇鋸訣絕軍駿顆殼課墾懇褲誇礦曠虧窺潰闊蠟臘萊欄攔籃蘭瀾攬懶纜爛濫撈勞樂壘淚麗厲勵歷瀝隸倆蓮憐簾斂臉戀煉糧涼輛諒療遼獵鄰賃齡鈴嶺劉龍聾籠壟攏摟蘆盧顱廬爐鹵魯陸驢呂鋁侶屢縷慮掄淪蘿羅駱媽瑪罵嗎麥賣邁脈瞞蠻貓錨貿鎂悶夢彌綿廟滅閩鳴銘謬謀畝鈉腦惱鬧釀鳥鎳檸寧擰鈕紐濃農毆嘔賠噴鵬騙飄貧蘋潑鋪樸譜淒騎豈棄牽鉛謙錢鉗淺譴搶橋喬僑翹竅竊欽親寢輕氫傾頃慶瓊窮趨軀勸饒擾榮絨銳潤灑薩賽傘喪騷澀殺紗曬閃陝傷賞燒紳腎滲繩勝聖獅濕詩屍蝕駛壽獸樞贖樹豎帥稅碩爍絲飼聳頌誦肅雖歲孫損攤貪癱灘壇譚嘆湯燙濤騰鐵廳銅頹駝襪彎頑韋違偉偽緯謂衛聞紋窩嗚烏誣吳霧錫犧襲習戲細蝦轄峽俠狹廈嚇鮮纖賢銜閒獻縣餡羨憲廂鄉詳曉攜諧瀉鋅興鏽繡軒懸尋馴遜鴨啞鹽顏艷厭諺楊陽癢養搖謠藥爺葉醫蟻藝億憶誼蔭陰銀櫻嬰鷹瑩螢蠅贏穎傭詠湧憂誘輿漁娛嶼獄譽淵圓願鑰嶽勻隕蘊韻贊鑿棗竈澤賊贈軋閘詐齋債斬嶄棧綻漲帳脹趙轍貞偵診鎮陣掙幀鄭摯擲幟腫皺晝豬諸燭矚囑貯鑄磚賺樁莊妝壯錐墜濁鑽";

  // Hong Kong wording and context-dependent characters (Simplified key → HK output).
  var PHRASES = {
    "信息技术": "資訊科技",
    "信息安全": "資訊安全",
    "信息": "資訊",
    "互联网": "互聯網",
    "网络": "網絡",
    "软件": "軟件",
    "服务器": "伺服器",
    "视频监控": "視像監控",
    "视频会议": "視像會議",
    "视频": "視像",
    "默认": "預設",
    "支持": "支援",
    "质量": "質素",
    "带宽": "頻寬",
    "宽带": "寬頻",
    "运营商": "電訊商",
    "屏幕": "螢幕",
    "账号": "帳號",
    "账户": "帳戶",
    "登录": "登入",
    "电子邮件": "電郵",
    "电子邮箱": "電郵",
    "邮箱": "電郵",
    "联系": "聯絡",
    "关系": "關係",
    "设置": "設定",
    "存储": "儲存",
    "集成": "整合",
    "消息": "訊息",
    "菜单": "選單",
    "导航": "導覽",
    "页脚": "頁尾",
    "返回顶部": "返回頁頂",
    "搜索": "搜尋",
    "计算机": "電腦",
    "摄像机": "攝影機",
    "摄像头": "鏡頭",
    "回复": "回覆",
    "答复": "答覆",
    "复核": "覆核",
    "反复": "反覆",
    "复盘": "覆盤",
    "复杂": "複雜",
    "重复": "重複",
    "复制": "複製",
    "复合": "複合",
    "复用": "重用",
    "恢复": "恢復",
    "修复": "修復",
    "其余": "其餘",
    "里程碑": "里程碑",
    "公里": "公里",
    "谢里丹": "謝里丹",
    "谢里登": "謝里登",
    "咨询": "諮詢",
    "托管": "託管",
    "布线": "佈線",
    "布局": "佈局",
    "短信": "短訊",
    "音频": "音訊",
    "字段": "欄位",
    "邮件": "電郵",
    "通过": "透過",
    "传感器": "感應器",
    "移动端": "流動裝置",
    "移动渠道": "流動渠道",
    "链接": "連結",
    "分辨率": "解像度",
    "周会": "週會",
    "周二": "週二",
    "三周": "三週",
    "每周": "每週",
    "周末": "週末",
    "本周": "本週",
    "周边": "周邊",
    "制造": "製造",
    "制作": "製作",
    "定制": "訂製",
    "制成": "製成",
    "批准": "批准",
    "准入": "准入",
    "准许": "准許",
    "注册": "註冊",
    "注明": "註明",
    "备注": "備註",
    "伙伴": "夥伴",
    "词汇": "詞彙",
    "日志": "日誌",
    "标志": "標誌",
    "细致": "細緻",
    "精致": "精緻",
    "上游": "上游",
    "下游": "下游",
    "宿舍": "宿舍",
    "防御": "防禦",
    "抵御": "抵禦",
    "风采": "風采",
    "合并": "合併",
    "兼并": "兼併",
    "后台": "後台",
    "制冷": "製冷",
    "接口": "介面",
    "周期": "週期",
    "分布": "分佈",
    "部署分布": "部署分佈",
    "后端": "後端",
  };

  // Exact full-string overrides, e.g. corrections from the Hong Kong review.
  // Key: Simplified source string (trimmed). Value: final HK text.
  var OVERRIDES = {
    "中文": "中文",
    // Language switcher: each option is shown in its own script.
    "简体中文": "简体中文",
  };

  // Spans that must never be reworded (only exact protection or char-only).
  var VERBATIM = /[一-鿿]*ICP[一-鿿]*[0-9\-]*[一-鿿]*/g;
  var LEGAL_NAME = /[一-鿿（）()]{2,}(?:有限公司|集团|学校)/g;

  var CHAR = {};
  (function () {
    var s = Array.from(S), t = Array.from(T);
    if (s.length !== t.length) throw new Error("zh-HK char map length mismatch");
    for (var i = 0; i < s.length; i++) CHAR[s[i]] = t[i];
  })();
  var PHRASE_KEYS = Object.keys(PHRASES).sort(function (a, b) { return b.length - a.length; });
  var MAX_PHRASE = PHRASE_KEYS.length ? PHRASE_KEYS[0].length : 0;
  var HAN = /[㐀-鿿]/;

  function charsOnly(text) {
    var out = "";
    for (var ch of text) out += CHAR[ch] || ch;
    return out;
  }

  function convertPlain(text) {
    var out = "";
    var i = 0;
    while (i < text.length) {
      var matched = false;
      for (var len = Math.min(MAX_PHRASE, text.length - i); len >= 2; len--) {
        var seg = text.substr(i, len);
        if (Object.prototype.hasOwnProperty.call(PHRASES, seg)) {
          out += PHRASES[seg];
          i += len;
          matched = true;
          break;
        }
      }
      if (matched) continue;
      var ch = text[i];
      out += CHAR[ch] || ch;
      i++;
    }
    return out;
  }

  function convert(text) {
    if (typeof text !== "string" || !HAN.test(text)) return text;
    var trimmed = text.trim();
    if (Object.prototype.hasOwnProperty.call(OVERRIDES, trimmed)) {
      return text.replace(trimmed, OVERRIDES[trimmed]);
    }
    // Split into protected and convertible spans.
    var spans = [];
    var re = new RegExp(VERBATIM.source + "|" + LEGAL_NAME.source, "g");
    var last = 0, m;
    while ((m = re.exec(text))) {
      if (!m[0]) { re.lastIndex++; continue; }
      if (m.index > last) spans.push(convertPlain(text.slice(last, m.index)));
      spans.push(/ICP/.test(m[0]) ? m[0] : charsOnly(m[0]));
      last = m.index + m[0].length;
    }
    if (last < text.length) spans.push(convertPlain(text.slice(last)));
    return spans.join("");
  }

  var api = { convert: convert, chars: CHAR, phrases: PHRASES, overrides: OVERRIDES };
  root.JotoZhHk = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;

  // ---------------------------------------------------------------- browser
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (!/^\/zh-hk(?:\/|$)/i.test(window.location.pathname)) return;

  var SKIP = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, TEXTAREA: 1, CODE: 1, PRE: 1 };
  var ATTRS = ["placeholder", "title", "aria-label", "alt"];
  var META_SELECTOR =
    'meta[name="description"],meta[property^="og:"],meta[name^="twitter:"]';

  function setIfChanged(node, prop, value) {
    if (node[prop] !== value) node[prop] = value;
  }

  function fixLdJson(script) {
    try {
      var data = JSON.parse(script.textContent);
      var walk = function (v) {
        if (typeof v === "string") return convert(v);
        if (Array.isArray(v)) return v.map(walk);
        if (v && typeof v === "object") {
          var o = {};
          for (var k in v) {
            if (k === "inLanguage" && v[k] === "zh-CN") o[k] = "zh-HK";
            else o[k] = walk(v[k]);
          }
          return o;
        }
        return v;
      };
      var next = JSON.stringify(walk(data));
      if (next !== script.textContent) script.textContent = next;
    } catch (e) { /* leave untouched */ }
  }

  function fixMeta(el) {
    var prop = el.getAttribute("property");
    var content = el.getAttribute("content");
    if (content == null) return;
    var next = content;
    if (prop === "og:locale" && content === "zh_CN") next = "zh_HK";
    else if (prop === "og:locale:alternate" && content === "zh_HK") next = "zh_CN";
    else next = convert(content);
    if (next !== content) el.setAttribute("content", next);
  }

  function processElement(el) {
    if (el.nodeType !== 1) return;
    if (el.tagName === "SCRIPT") {
      if (el.type === "application/ld+json") fixLdJson(el);
      return;
    }
    if (el.tagName === "META") { if (el.matches(META_SELECTOR)) fixMeta(el); return; }
    for (var i = 0; i < ATTRS.length; i++) {
      var a = el.getAttribute(ATTRS[i]);
      if (a && HAN.test(a)) {
        var na = convert(a);
        if (na !== a) el.setAttribute(ATTRS[i], na);
      }
    }
    if (el.tagName === "INPUT" && (el.type === "submit" || el.type === "button") && HAN.test(el.value)) {
      setIfChanged(el, "value", convert(el.value));
    }
    if (el.tagName === "HTML" && el.lang === "zh-CN") el.lang = "zh-HK";
  }

  function processTree(node) {
    if (!node) return;
    if (node.nodeType === 3) {
      var p = node.parentNode;
      if (p && SKIP[p.nodeName]) return;
      if (HAN.test(node.nodeValue)) setIfChanged(node, "nodeValue", convert(node.nodeValue));
      return;
    }
    if (node.nodeType !== 1 && node.nodeType !== 9 && node.nodeType !== 11) return;
    if (node.nodeType === 1) {
      processElement(node);
      if (SKIP[node.nodeName] && node.nodeName !== "SCRIPT") return;
      if (node.nodeName === "SCRIPT") return;
    }
    var walker = document.createTreeWalker(node, 5 /* ELEMENT | TEXT */);
    var cur;
    while ((cur = walker.nextNode())) {
      if (cur.nodeType === 1) processElement(cur);
      else if (cur.parentNode && !SKIP[cur.parentNode.nodeName] && HAN.test(cur.nodeValue)) {
        setIfChanged(cur, "nodeValue", convert(cur.nodeValue));
      }
    }
  }

  function syncDocument() {
    var html = document.documentElement;
    if (html.lang !== "zh-HK") html.lang = "zh-HK";
    if (HAN.test(document.title)) {
      var t = convert(document.title);
      if (t !== document.title) document.title = t;
    }
  }

  var observer = new MutationObserver(function (records) {
    for (var i = 0; i < records.length; i++) {
      var r = records[i];
      if (r.type === "characterData") processTree(r.target);
      else if (r.type === "attributes") {
        if (r.target === document.documentElement && r.attributeName === "lang") {
          if (document.documentElement.lang !== "zh-HK") document.documentElement.lang = "zh-HK";
        } else processElement(r.target);
      } else for (var j = 0; j < r.addedNodes.length; j++) processTree(r.addedNodes[j]);
    }
    syncDocument();
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ATTRS.concat(["content", "lang", "value"]),
  });
  processTree(document.documentElement);
  syncDocument();
  document.addEventListener("DOMContentLoaded", function () { processTree(document.documentElement); syncDocument(); });
})(typeof window !== "undefined" ? window : globalThis);
