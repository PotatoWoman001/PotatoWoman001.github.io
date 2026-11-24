const pages = {"/": ["IT Solutions in Thailand, Hong Kong & Singapore | JOTO", "Plan enterprise networks and security in Thailand, Hong Kong and Singapore. Discuss Cisco, Verkada, KnowBe4 and Fortinet solutions with JOTO.", "IT projects in Thailand, Hong Kong and Singapore", "Planning a new office, campus or branch? Discuss Cisco networking, Verkada cameras and access control, KnowBe4 awareness training, or Fortinet security with JOTO. Share your locations, existing systems and project timeline so we can assess solution fit and delivery scope."], "/solutions/network": ["Cisco Networking & Meraki Deployment | JOTO Global", "Plan Cisco networking and Meraki deployments for Thailand, Hong Kong and Singapore. Discuss Wi-Fi, switching and multi-site requirements with JOTO.", "Cisco networking across your regional sites", "For projects in Thailand, Hong Kong and Singapore, start with site surveys, Wi-Fi coverage, switching capacity, branch connectivity and operational ownership. Discuss Cisco and Meraki requirements with JOTO to define a deployment and acceptance plan."], "/solutions/security": ["Fortinet & KnowBe4 Security Solutions | JOTO Global", "Explore Fortinet firewalls, SD-WAN and KnowBe4 training for Thailand, Hong Kong and Singapore. Discuss deployment, migration and awareness needs.", "Network security and employee awareness", "For teams in Thailand, Hong Kong and Singapore, assess Fortinet FortiGate and SD-WAN requirements alongside KnowBe4 security awareness training and phishing simulations. Define your users, sites, migration constraints and success criteria before selecting a solution."], "/solutions/safeguarding": ["Verkada Cameras & Access Control | JOTO Global", "Plan Verkada cameras and access control for Thailand, Hong Kong and Singapore. Discuss site coverage, network readiness and deployment with JOTO.", "Verkada physical security project planning", "Planning video security or access control in Thailand, Hong Kong or Singapore? Discuss Verkada coverage, network readiness, user permissions and operational handover with JOTO. Product availability and local delivery scope are confirmed during project assessment."], "/zh": ["泰国、香港、新加坡企业 IT 解决方案 | JOTO Global", "面向泰国、香港与新加坡的企业 IT 项目，咨询 Cisco 网络、Verkada 安防、KnowBe4 安全意识培训与 Fortinet 安全方案，规划选型、部署及运维。", "泰国、香港与新加坡的企业 IT 项目", "新建办公室、园区或分支机构时，可向 JOTO 咨询 Cisco 网络、Verkada 摄像头与门禁、KnowBe4 安全意识培训及 Fortinet 安全方案。请提供项目地点、现有系统和时间计划，我们会据此评估方案适配性与交付范围。"], "/zh/solutions/network": ["Cisco 网络与 Meraki 部署方案 | JOTO Global", "为泰国、香港、新加坡的企业项目规划 Cisco 网络与 Meraki 部署，覆盖无线网络、交换机、多分支连接及实施验收需求。", "跨地区 Cisco 网络规划与部署", "针对泰国、香港和新加坡的企业网络项目，从现场勘测、无线覆盖、交换容量、分支连接和运维责任出发，评估 Cisco 与 Meraki 方案。与 JOTO 明确部署要求、维护窗口和验收标准。"], "/zh/solutions/security": ["Fortinet 与 KnowBe4 企业安全方案 | JOTO Global", "面向泰国、香港与新加坡的企业，评估 Fortinet 防火墙和 SD-WAN，以及 KnowBe4 安全意识培训与钓鱼模拟，规划实施与效果验收。", "网络安全与员工安全意识协同规划", "围绕泰国、香港和新加坡的团队与分支业务，评估 Fortinet FortiGate 防火墙、SD-WAN，以及 KnowBe4 安全意识培训与钓鱼模拟。选型前明确用户规模、部署地点、迁移限制和可验证的项目目标。"], "/zh/solutions/safeguarding": ["Verkada 视频安防与门禁方案 | JOTO Global", "为泰国、香港与新加坡的园区和办公项目规划 Verkada 摄像头、视频安防及门禁，评估覆盖范围、网络条件和实施交接要求。", "Verkada 视频安防与门禁项目规划", "计划在泰国、香港或新加坡部署视频安防或门禁时，可与 JOTO 评估 Verkada 的覆盖范围、网络条件、权限管理和运维交接。具体产品可用性和当地交付范围将在项目评估中确认。"]};

let pending = false;
function update() {
 pending=false;
 const path=location.pathname.replace(/\/$/,'')||'/';
 let block=document.getElementById('joto-regional-projects');
 if(block&&block.dataset.path!==path){block.remove();block=null;}
 const d=pages[path]; if(!d)return;
 if(document.title!==d[0])document.title=d[0];
 for(const [attribute,name,value] of [['name','description',d[1]],['property','og:title',d[0]],['property','og:description',d[1]],['name','twitter:title',d[0]],['name','twitter:description',d[1]]]) {
  const matches=[...document.head.querySelectorAll(`meta[${attribute}="${name}"]`)];
  let e=matches.find(node=>node.hasAttribute('data-joto-seo'))||matches[0];
  for(const duplicate of matches)if(duplicate!==e)duplicate.remove();
  if(!e){e=document.createElement('meta');e.setAttribute(attribute,name);e.setAttribute('data-joto-seo','');document.head.append(e);}
  if(e.content!==value)e.content=value;
 }
 for(const script of document.head.querySelectorAll('script[type="application/ld+json"][data-joto-seo]')) {
  try {
   const value=JSON.parse(script.textContent);
   for(const item of value['@graph']||[])if(item['@type']==='WebPage'){item.name=d[0];item.description=d[1];}
   const text=JSON.stringify(value);if(script.textContent!==text)script.textContent=text;
  }catch{}
 }
 const h1=document.querySelector('h1');
 if(!h1||block)return;
 const anchor=document.querySelector('footer')||document.querySelector('main');
 if(!anchor)return;
 block=document.createElement('section');block.id='joto-regional-projects';block.dataset.path=path;
 block.style.cssText='max-width:1200px;margin:48px auto;padding:24px clamp(20px,4vw,48px);font-family:inherit;text-align:left;line-height:1.7;color:inherit';
 const heading=document.createElement('h2');heading.textContent=d[2];heading.style.cssText='font-size:clamp(24px,3vw,36px);line-height:1.2;margin:0 0 20px';
 const p=document.createElement('p');p.textContent=d[3];p.style.cssText='max-width:850px;font-size:16px';
 const link=document.createElement('a');link.href=path.startsWith('/zh')?'/zh/contact':'/contact';link.textContent=path.startsWith('/zh')?'咨询项目方案':'Discuss your project';link.style.cssText='display:inline-block;margin-top:16px;text-decoration:underline;font-weight:600';
 block.append(heading,p,link);
 if(anchor.tagName==='FOOTER')anchor.before(block);else anchor.append(block);
}
function schedule(){if(!pending){pending=true;requestAnimationFrame(update);}}
new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['content']});
addEventListener('popstate',schedule);schedule();
