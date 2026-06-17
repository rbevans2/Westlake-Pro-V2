import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

let supabase=null, currentUser=null, businessId=null, jobFilter="upcoming";
const state={business:null,customers:[],jobs:[],documents:[],services:[],equipment:[],expenses:[]};
const DEFAULT_SERVICES=["Tree Removal","Stump Grinding","Tree Trimming / Pruning","Storm Cleanup","Mulch Installation"];

document.addEventListener("DOMContentLoaded", init);

async function init(){
  bindEvents();
  const url=localStorage.getItem("WESTLAKE_SUPABASE_URL");
  const key=localStorage.getItem("WESTLAKE_SUPABASE_ANON");
  if(!url||!key){showOnly("setupScreen");return;}
  await initSupabase(url,key);
}

function bindEvents(){
  on("saveSetupBtn",saveSetup);on("resetSetupBtn",resetSetup);on("resetSetupInAppBtn",resetSetup);
  on("signInBtn",signIn);on("signUpBtn",signUp);on("resetPasswordBtn",resetPassword);
  on("createBusinessBtn",createBusiness);on("joinBusinessBtn",joinBusiness);on("businessSignOutBtn",signOut);on("signOutBtn",signOut);
  document.querySelectorAll(".tab").forEach(b=>b.addEventListener("click",()=>showView(b.dataset.view)));
  document.querySelectorAll("[data-view-btn]").forEach(b=>b.addEventListener("click",()=>showView(b.dataset.viewBtn)));
  document.querySelectorAll("[data-job-filter]").forEach(b=>b.addEventListener("click",()=>{document.querySelectorAll("[data-job-filter]").forEach(x=>x.classList.remove("active"));b.classList.add("active");jobFilter=b.dataset.jobFilter;renderJobs();}));
  on("homeNewInvoiceBtn",()=>{clearDocument();showView("documents")});
  on("clearJobBtn",clearJob);on("saveJobBtn",saveJob);on("deleteJobBtn",deleteJob);
  on("clearDocumentBtn",clearDocument);on("saveDocumentBtn",saveDocument);on("deleteDocumentBtn",deleteDocument);on("convertEstimateBtn",convertEstimate);on("printDocumentBtn",printCurrentDocument);on("addBlankLineBtn",()=>addLine());on("addServiceLineBtn",addServiceLine);
  byId("documentApplyTax").addEventListener("change",calcDocTotals);byId("documentTaxRate").addEventListener("input",calcDocTotals);byId("documentSearch").addEventListener("input",renderDocuments);
  on("clearCustomerBtn",clearCustomer);on("saveCustomerBtn",saveCustomer);on("deleteCustomerBtn",deleteCustomer);byId("customerSearch").addEventListener("input",renderCustomers);
  on("clearEquipmentBtn",clearEquipment);on("saveEquipmentBtn",saveEquipment);on("deleteEquipmentBtn",deleteEquipment);
  on("clearExpenseBtn",clearExpense);on("saveExpenseBtn",saveExpense);on("deleteExpenseBtn",deleteExpense);
  on("saveSettingsBtn",saveSettings);on("saveServiceBtn",saveService);on("deleteServiceBtn",deleteService);
  on("exportMarketingBtn",exportMarketingCSV);on("copyMarketingEmailsBtn",copyMarketingEmails);byId("exportOnlyMarketingOk").addEventListener("change",renderMarketing);
  on("exportBackupBtn",exportBackup);byId("importBackupFile").addEventListener("change",()=>alert("Backup import is manual-safe in this cloud version to avoid duplicate records."));
  byId("reportYear").addEventListener("change",renderReports);on("exportYearReportBtn",exportYearCSV);
}

function on(id,fn){const el=byId(id);if(el)el.addEventListener("click",fn)}
function byId(id){return document.getElementById(id)}
function showOnly(id){["setupScreen","authScreen","businessScreen","appShell"].forEach(x=>byId(x).classList.add("hidden"));byId(id).classList.remove("hidden")}
function msg(id,text){byId(id).textContent=text||""}

async function saveSetup(){const url=val("supabaseUrl").trim(),key=val("supabaseAnonKey").trim();if(!url||!key)return alert("URL and anon key are required.");localStorage.setItem("WESTLAKE_SUPABASE_URL",url);localStorage.setItem("WESTLAKE_SUPABASE_ANON",key);await initSupabase(url,key)}
function resetSetup(){if(confirm("Reset Supabase setup on this phone?")){localStorage.removeItem("WESTLAKE_SUPABASE_URL");localStorage.removeItem("WESTLAKE_SUPABASE_ANON");location.reload()}}

async function initSupabase(url,key){
  try{supabase=createClient(url,key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}})}
  catch(e){alert(e.message);showOnly("setupScreen");return;}
  const {data}=await supabase.auth.getSession();currentUser=data.session?.user||null;
  supabase.auth.onAuthStateChange(async(_event,session)=>{currentUser=session?.user||null;if(currentUser)await afterLogin();else showOnly("authScreen")});
  if(currentUser)await afterLogin();else showOnly("authScreen");
}

async function signIn(){msg("authMessage","Signing in...");const {error}=await supabase.auth.signInWithPassword({email:val("authEmail").trim(),password:val("authPassword")});msg("authMessage",error?error.message:"Signed in.")}
async function signUp(){msg("authMessage","Creating account...");const {error}=await supabase.auth.signUp({email:val("authEmail").trim(),password:val("authPassword")});msg("authMessage",error?error.message:"Account created. You can sign in now.")}
async function resetPassword(){const email=val("authEmail").trim();if(!email)return msg("authMessage","Enter your email first.");const {error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:location.href});msg("authMessage",error?error.message:"Password reset email sent.")}
async function signOut(){await supabase.auth.signOut()}

async function afterLogin(){
  const {data,error}=await supabase.from("business_members").select("business_id").limit(1);
  if(error){alert(error.message);return;}
  if(!data||!data.length){showOnly("businessScreen");return;}
  businessId=data[0].business_id;await loadAll();showOnly("appShell");renderAll();
}

async function createBusiness(){
  const name=val("businessCreateName")||"Westlake Tree Experts";
  const {data:biz,error}=await supabase.from("businesses").insert({name}).select().single();
  if(error)return msg("businessMessage",error.message);
  const {error:memberError}=await supabase.from("business_members").insert({business_id:biz.id,user_id:currentUser.id,role:"owner"});
  if(memberError)return msg("businessMessage",memberError.message);
  businessId=biz.id;await seedDefaults();await afterLogin();
}
async function joinBusiness(){
  const id=val("joinBusinessId").trim();if(!id)return msg("businessMessage","Paste Business ID.");
  const {error}=await supabase.from("business_members").insert({business_id:id,user_id:currentUser.id,role:"member"});
  if(error)return msg("businessMessage",error.message);
  businessId=id;await afterLogin();
}

async function loadAll(){await Promise.all([load("businesses","business"),load("customers"),load("jobs"),load("documents"),load("services"),load("equipment"),load("expenses")]);if(!state.services.length)await seedDefaults()}
async function load(table,key=table){let q=supabase.from(table).select("*");if(table==="businesses")q=q.eq("id",businessId).single();else q=q.eq("business_id",businessId).order("created_at",{ascending:false});const {data,error}=await q;if(error){alert(`${table}: ${error.message}`);return;}state[key]=data||([])}
async function seedDefaults(){for(const name of DEFAULT_SERVICES){await supabase.from("services").insert({business_id:businessId,name,description:name,price:0})}await load("services")}

function renderAll(){renderOptions();renderHome();renderJobs();renderDocuments();renderCustomers();renderEquipment();renderExpenses();renderSettings();renderServices();renderHistory();renderMarketing();renderReports()}
function showView(id){document.querySelectorAll(".view").forEach(v=>v.classList.remove("active"));document.querySelectorAll(".tab").forEach(t=>t.classList.toggle("active",t.dataset.view===id));byId(id).classList.add("active");renderAll()}
function renderOptions(){
 const cust='<option value="">None</option>'+state.customers.map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join("");
 ["jobCustomer","documentCustomer"].forEach(id=>byId(id).innerHTML=cust);
 byId("documentJob").innerHTML='<option value="">None</option>'+state.jobs.map(j=>`<option value="${j.id}">${esc(j.title)} - ${esc(j.job_date||"")}</option>`).join("");
 byId("servicePicker").innerHTML='<option value="">Choose service</option>'+state.services.map(s=>`<option value="${s.id}">${esc(s.name)} ${s.price?money(s.price):""}</option>`).join("");
}
function renderHome(){const paid=state.documents.filter(d=>d.type==="Invoice"&&d.status==="Paid"),yr=new Date().getFullYear(),mo=new Date().getMonth();setText("homeRevenue",money(sum(paid,"total")));setText("homeMonth",money(sum(paid.filter(d=>new Date(d.doc_date).getFullYear()===yr&&new Date(d.doc_date).getMonth()===mo),"total")));setText("homeOutstanding",money(sum(state.documents.filter(d=>d.type==="Invoice"&&d.status!=="Paid"),"total")));setText("homeTax",money(sum(paid,"tax")));setText("homeJobs",state.jobs.filter(j=>j.status!=="Complete"&&j.status!=="Cancelled").length);setText("homeCustomers",state.customers.length)}

function clearJob(){["jobId","jobTitle","jobStart","jobEnd","jobLocation","jobNotes"].forEach(id=>setVal(id,""));setVal("jobDate",today());setVal("jobStatus","Upcoming");setVal("jobCustomer","")}
async function saveJob(){if(!val("jobTitle"))return alert("Job title required.");const c=state.customers.find(x=>x.id===val("jobCustomer"));const rec={business_id:businessId,customer_id:val("jobCustomer")||null,customer_name:c?.name||"",title:val("jobTitle"),status:val("jobStatus"),job_date:val("jobDate"),start_time:val("jobStart")||null,end_time:val("jobEnd")||null,location:val("jobLocation"),notes:val("jobNotes")};await upsert("jobs",val("jobId"),rec);await load("jobs");clearJob();renderAll()}
function editJob(id){const j=state.jobs.find(x=>x.id===id);if(!j)return;setVal("jobId",j.id);setVal("jobCustomer",j.customer_id||"");setVal("jobTitle",j.title);setVal("jobStatus",j.status);setVal("jobDate",j.job_date);setVal("jobStart",j.start_time||"");setVal("jobEnd",j.end_time||"");setVal("jobLocation",j.location||"");setVal("jobNotes",j.notes||"");showView("jobs")}
async function deleteJob(){await del("jobs",val("jobId"));await load("jobs");clearJob();renderAll()}
function renderJobs(){let jobs=[...state.jobs].sort((a,b)=>(a.job_date||"").localeCompare(b.job_date||""));if(jobFilter==="upcoming")jobs=jobs.filter(j=>(j.job_date||"")>=today()&&j.status!=="Complete"&&j.status!=="Cancelled");byId("jobList").innerHTML=jobs.map(j=>`<div class="list-item"><h4>${esc(j.title)} <span class="pill">${esc(j.status)}</span></h4><p>${esc(j.customer_name||"")} • ${esc(j.job_date||"")} ${esc(j.start_time||"")}</p><p>${esc(j.location||"")}</p><button onclick="window.editJob('${j.id}')">Edit</button></div>`).join("")||"<p>No jobs.</p>"}

function clearDocument(){["documentId","documentNotes"].forEach(id=>setVal(id,""));setVal("documentType","Invoice");setVal("documentStatus","Draft");setVal("documentCustomer","");setVal("documentJob","");setVal("documentNumber",nextNumber("Invoice"));setVal("documentDate",today());setVal("documentDue",addDays(15));byId("lineItems").innerHTML="";addLine();byId("documentApplyTax").checked=false;setVal("documentTaxRate",state.business?.default_tax_rate||6);calcDocTotals()}
function nextNumber(type){return(type==="Estimate"?"EST-":"INV-")+(1001+state.documents.filter(d=>d.type===type).length)}
function addLine(desc="",amt=""){const row=document.createElement("div");row.className="line-item";row.innerHTML=`<label>Description<input class="line-description" value="${attr(desc)}"></label><label>Amount<input class="line-amount" type="number" step="0.01" value="${amt}"></label><button class="danger" type="button">×</button>`;row.querySelector(".line-amount").addEventListener("input",calcDocTotals);row.querySelector("button").addEventListener("click",()=>{row.remove();calcDocTotals()});byId("lineItems").appendChild(row)}
function addServiceLine(){const s=state.services.find(x=>x.id===val("servicePicker"));if(!s)return alert("Choose service.");addLine(s.description||s.name,s.price||"");calcDocTotals()}
function getLines(){return[...document.querySelectorAll("#lineItems .line-item")].map(r=>({description:r.querySelector(".line-description").value,amount:Number(r.querySelector(".line-amount").value||0)})).filter(x=>x.description||x.amount)}
function calcDocTotals(){const subtotal=sum(getLines(),"amount"),tax=byId("documentApplyTax").checked?subtotal*(Number(val("documentTaxRate")||0)/100):0;setText("documentSubtotal",money(subtotal));setText("documentTax",money(tax));setText("documentTotal",money(subtotal+tax));return{subtotal,tax,total:subtotal+tax}}
async function saveDocument(){const t=calcDocTotals(),c=state.customers.find(x=>x.id===val("documentCustomer")),j=state.jobs.find(x=>x.id===val("documentJob"));const rec={business_id:businessId,type:val("documentType"),status:val("documentStatus"),customer_id:val("documentCustomer")||null,customer_name:c?.name||"",job_id:val("documentJob")||null,job_title:j?.title||"",number:val("documentNumber")||nextNumber(val("documentType")),doc_date:val("documentDate"),due_date:val("documentDue"),line_items:getLines(),apply_tax:byId("documentApplyTax").checked,tax_rate:Number(val("documentTaxRate")||0),subtotal:t.subtotal,tax:t.tax,total:t.total,notes:val("documentNotes")};await upsert("documents",val("documentId"),rec);await load("documents");clearDocument();renderAll()}
function editDocument(id){const d=state.documents.find(x=>x.id===id);if(!d)return;setVal("documentId",d.id);setVal("documentType",d.type);setVal("documentStatus",d.status);setVal("documentCustomer",d.customer_id||"");setVal("documentJob",d.job_id||"");setVal("documentNumber",d.number);setVal("documentDate",d.doc_date);setVal("documentDue",d.due_date);byId("lineItems").innerHTML="";(d.line_items||[]).forEach(i=>addLine(i.description,i.amount));byId("documentApplyTax").checked=!!d.apply_tax;setVal("documentTaxRate",d.tax_rate);setVal("documentNotes",d.notes||"");calcDocTotals();showView("documents")}
async function deleteDocument(){await del("documents",val("documentId"));await load("documents");clearDocument();renderAll()}
async function convertEstimate(){const d=state.documents.find(x=>x.id===val("documentId")&&x.type==="Estimate");if(!d)return alert("Open a saved estimate first.");const copy={...d,type:"Invoice",status:"Draft",number:nextNumber("Invoice"),due_date:addDays(15),business_id:businessId};delete copy.id;delete copy.created_at;await supabase.from("documents").insert(copy);await load("documents");renderAll();alert("Converted.")}
function renderDocuments(){const q=val("documentSearch").toLowerCase();byId("documentList").innerHTML=state.documents.filter(d=>JSON.stringify(d).toLowerCase().includes(q)).map(d=>`<div class="list-item"><h4>${esc(d.type)} ${esc(d.number)} <span class="pill ${String(d.status).toLowerCase()}">${esc(d.status)}</span></h4><p>${esc(d.customer_name||"")} • ${esc(d.doc_date||"")} • <strong>${money(d.total)}</strong></p><button onclick="window.editDocument('${d.id}')">Open</button> <button onclick="window.printRecord('${d.id}')">PDF</button></div>`).join("")||"<p>No documents.</p>"}

function clearCustomer(){["customerId","customerName","customerPhone","customerEmail","customerAddress","customerNotes"].forEach(id=>setVal(id,""));byId("customerMarketingOk").checked=false}
async function saveCustomer(){if(!val("customerName"))return alert("Name required.");const rec={business_id:businessId,name:val("customerName"),phone:val("customerPhone"),email:val("customerEmail"),address:val("customerAddress"),notes:val("customerNotes"),marketing_ok:byId("customerMarketingOk").checked};await upsert("customers",val("customerId"),rec);await load("customers");clearCustomer();renderAll()}
function editCustomer(id){const c=state.customers.find(x=>x.id===id);if(!c)return;setVal("customerId",c.id);setVal("customerName",c.name);setVal("customerPhone",c.phone);setVal("customerEmail",c.email);setVal("customerAddress",c.address);setVal("customerNotes",c.notes);byId("customerMarketingOk").checked=!!c.marketing_ok;showView("customers")}
async function deleteCustomer(){await del("customers",val("customerId"));await load("customers");clearCustomer();renderAll()}
function renderCustomers(){const q=val("customerSearch").toLowerCase();byId("customerList").innerHTML=state.customers.filter(c=>JSON.stringify(c).toLowerCase().includes(q)).map(c=>{const docs=state.documents.filter(d=>d.customer_id===c.id),paid=sum(docs.filter(d=>d.status==="Paid"),"total");return`<div class="list-item"><h4>${esc(c.name)}</h4><p>${esc(c.phone||"")} ${esc(c.email||"")}</p><p>${esc(c.address||"")}</p><p>History: ${docs.length} docs • ${money(paid)} paid</p>${c.marketing_ok?'<span class="pill">Marketing OK</span>':''}<button onclick="window.editCustomer('${c.id}')">Edit</button></div>`}).join("")||"<p>No customers.</p>"}

function clearEquipment(){["equipmentId","equipmentName","equipmentSerial","equipmentHours","equipmentLastService","equipmentNextService","equipmentNotes"].forEach(id=>setVal(id,""))}
async function saveEquipment(){if(!val("equipmentName"))return alert("Name required.");const rec={business_id:businessId,name:val("equipmentName"),serial:val("equipmentSerial"),hours:val("equipmentHours"),last_service:val("equipmentLastService")||null,next_service:val("equipmentNextService")||null,notes:val("equipmentNotes")};await upsert("equipment",val("equipmentId"),rec);await load("equipment");clearEquipment();renderAll()}
function editEquipment(id){const e=state.equipment.find(x=>x.id===id);if(!e)return;setVal("equipmentId",e.id);setVal("equipmentName",e.name);setVal("equipmentSerial",e.serial);setVal("equipmentHours",e.hours);setVal("equipmentLastService",e.last_service);setVal("equipmentNextService",e.next_service);setVal("equipmentNotes",e.notes);showView("equipment")}
async function deleteEquipment(){await del("equipment",val("equipmentId"));await load("equipment");clearEquipment();renderAll()}
function renderEquipment(){byId("equipmentList").innerHTML=state.equipment.map(e=>`<div class="list-item"><h4>${esc(e.name)}</h4><p>${esc(e.serial||"")} • Hours: ${esc(e.hours||"")}</p><p>Last: ${esc(e.last_service||"")} • Next: ${esc(e.next_service||"")}</p><button onclick="window.editEquipment('${e.id}')">Edit</button></div>`).join("")||"<p>No equipment.</p>"}

function clearExpense(){setVal("expenseId","");setVal("expenseDate",today());setVal("expenseCategory","Fuel");setVal("expenseDescription","");setVal("expenseAmount","")}
async function saveExpense(){if(!val("expenseDescription"))return alert("Description required.");const rec={business_id:businessId,expense_date:val("expenseDate"),category:val("expenseCategory"),description:val("expenseDescription"),amount:Number(val("expenseAmount")||0)};await upsert("expenses",val("expenseId"),rec);await load("expenses");clearExpense();renderAll()}
function editExpense(id){const e=state.expenses.find(x=>x.id===id);if(!e)return;setVal("expenseId",e.id);setVal("expenseDate",e.expense_date);setVal("expenseCategory",e.category);setVal("expenseDescription",e.description);setVal("expenseAmount",e.amount);showView("expenses")}
async function deleteExpense(){await del("expenses",val("expenseId"));await load("expenses");clearExpense();renderAll()}
function renderExpenses(){byId("expenseList").innerHTML=state.expenses.map(e=>`<div class="list-item"><h4>${esc(e.description)} • ${money(e.amount)}</h4><p>${esc(e.expense_date||"")} • ${esc(e.category||"")}</p><button onclick="window.editExpense('${e.id}')">Edit</button></div>`).join("")||"<p>No expenses.</p>"}

function renderSettings(){if(!state.business)return;setText("businessIdDisplay",businessId);setVal("settingsBusinessName",state.business.name);setVal("settingsPhone",state.business.phone);setVal("settingsEmail",state.business.email);setVal("settingsAddress",state.business.address);setVal("settingsTaxRate",state.business.default_tax_rate)}
async function saveSettings(){const rec={name:val("settingsBusinessName"),phone:val("settingsPhone"),email:val("settingsEmail"),address:val("settingsAddress"),default_tax_rate:Number(val("settingsTaxRate")||6)};await supabase.from("businesses").update(rec).eq("id",businessId);await load("businesses","business");renderAll();alert("Settings saved.")}
async function saveService(){if(!val("serviceName"))return alert("Name required.");const rec={business_id:businessId,name:val("serviceName"),description:val("serviceDescription"),price:Number(val("servicePrice")||0)};await upsert("services",val("serviceId"),rec);await load("services");clearService();renderAll()}
function clearService(){["serviceId","serviceName","serviceDescription","servicePrice"].forEach(id=>setVal(id,""))}
function editService(id){const s=state.services.find(x=>x.id===id);if(!s)return;setVal("serviceId",s.id);setVal("serviceName",s.name);setVal("serviceDescription",s.description);setVal("servicePrice",s.price);showView("settings")}
async function deleteService(){await del("services",val("serviceId"));await load("services");clearService();renderAll()}
function renderServices(){byId("serviceList").innerHTML=state.services.map(s=>`<div class="list-item"><h4>${esc(s.name)} • ${money(s.price)}</h4><p>${esc(s.description||"")}</p><button onclick="window.editService('${s.id}')">Edit</button></div>`).join("")||"<p>No services.</p>"}
function renderHistory(){byId("historyList").innerHTML=state.documents.slice(0,50).map(d=>`<div class="list-item"><h4>${esc(d.type)} ${esc(d.number)}</h4><p>${esc(d.customer_name||"")} • ${esc(d.doc_date||"")} • ${money(d.total)}</p></div>`).join("")||"<p>No history.</p>"}
function renderMarketing(){const only=byId("exportOnlyMarketingOk").checked,rows=state.customers.filter(c=>c.email&&(!only||c.marketing_ok));byId("marketingList").innerHTML=rows.map(c=>`<div class="list-item"><h4>${esc(c.name)}</h4><p>${esc(c.email)}</p>${c.marketing_ok?'<span class="pill">Marketing OK</span>':''}</div>`).join("")||"<p>No contacts.</p>"}
function renderReports(){const yrs=[...new Set([new Date().getFullYear(),...state.documents.map(d=>year(d.doc_date)).filter(Boolean),...state.expenses.map(e=>year(e.expense_date)).filter(Boolean)])].sort((a,b)=>b-a),sel=byId("reportYear"),cur=sel.value||yrs[0];sel.innerHTML=yrs.map(y=>`<option value="${y}">${y}</option>`).join("");sel.value=yrs.includes(Number(cur))?cur:yrs[0];const y=Number(sel.value),docs=state.documents.filter(d=>d.type==="Invoice"&&d.status==="Paid"&&year(d.doc_date)===y),exps=state.expenses.filter(e=>year(e.expense_date)===y);setText("reportRevenue",money(sum(docs,"total")));setText("reportExpenses",money(sum(exps,"amount")));setText("reportNet",money(sum(docs,"total")-sum(exps,"amount")));setText("reportTax",money(sum(docs,"tax")));setText("reportTaxable",money(sum(docs.filter(d=>d.apply_tax),"subtotal")));setText("reportPaidJobs",docs.length);const byM={};docs.forEach(d=>{const k=(d.doc_date||"").slice(0,7);byM[k]=(byM[k]||0)+Number(d.total||0)});const max=Math.max(...Object.values(byM),1);byId("monthlyBars").innerHTML=Object.entries(byM).sort().map(([m,t])=>`<div class="bar-row"><span>${m.slice(5)}</span><div class="bar" style="width:${Math.max(4,t/max*100)}%"></div><strong>${money(t)}</strong></div>`).join("")||"<p>No paid revenue.</p>"}

async function upsert(table,id,rec){const res=id?await supabase.from(table).update(rec).eq("id",id):await supabase.from(table).insert(rec);if(res.error)alert(res.error.message)}
async function del(table,id){if(!id)return alert("No record selected.");if(!confirm("Delete this record?"))return;const{error}=await supabase.from(table).delete().eq("id",id);if(error)alert(error.message)}
function printCurrentDocument(){const d=state.documents.find(x=>x.id===val("documentId"));if(!d)return alert("Open or save a document first.");printRecord(d.id)}
function printRecord(id){const d=state.documents.find(x=>x.id===id),b=state.business;if(!d)return;byId("printArea").innerHTML=`<div class="print-document"><div class="print-header"><div><img class="print-logo" src="logo.png"><p><strong>${esc(b.name||"")}</strong><br>${esc(b.phone||"")}<br>${esc(b.email||"")}<br>${esc(b.address||"").replaceAll("\n","<br>")}</p></div><div class="print-title"><h2>${esc(d.type).toUpperCase()}</h2><p><strong># ${esc(d.number)}</strong><br>Date: ${esc(d.doc_date||"")}<br>Due: ${esc(d.due_date||"")}<br>Status: ${esc(d.status||"")}</p></div></div><p><strong>Customer:</strong> ${esc(d.customer_name||"")}</p><table class="print-table"><thead><tr><th>Description</th><th>Amount</th></tr></thead><tbody>${(d.line_items||[]).map(i=>`<tr><td>${esc(i.description)}</td><td>${money(i.amount)}</td></tr>`).join("")}</tbody></table><div class="print-totals"><div><span>Subtotal</span><strong>${money(d.subtotal)}</strong></div><div><span>Tax</span><strong>${money(d.tax)}</strong></div><div class="grand"><span>Total</span><strong>${money(d.total)}</strong></div></div><p>${esc(d.notes||"").replaceAll("\n","<br>")}</p></div>`;setTimeout(()=>print(),100)}
function exportMarketingCSV(){const only=byId("exportOnlyMarketingOk").checked,rows=[["FIRSTNAME","LASTNAME","EMAIL","SMS","ADDRESS","MARKETING_OK"]];state.customers.filter(c=>c.email&&(!only||c.marketing_ok)).forEach(c=>{const p=String(c.name||"").split(/\s+/),first=p.shift()||"";rows.push([first,p.join(" "),c.email||"",c.phone||"",c.address||"",c.marketing_ok?"yes":"no"])});downloadCSV("westlake-brevo-contacts.csv",rows)}
async function copyMarketingEmails(){const only=byId("exportOnlyMarketingOk").checked,emails=state.customers.filter(c=>c.email&&(!only||c.marketing_ok)).map(c=>c.email).join(", ");if(!emails)return alert("No emails.");try{await navigator.clipboard.writeText(emails);alert("Copied.")}catch{prompt("Copy emails:",emails)}}
function exportYearCSV(){const y=Number(val("reportYear")),rows=[["TYPE","DATE","NUMBER/CATEGORY","CUSTOMER/DESCRIPTION","STATUS","SUBTOTAL","TAX","TOTAL"]];state.documents.filter(d=>year(d.doc_date)===y).forEach(d=>rows.push([d.type,d.doc_date,d.number,d.customer_name,d.status,d.subtotal,d.tax,d.total]));state.expenses.filter(e=>year(e.expense_date)===y).forEach(e=>rows.push(["Expense",e.expense_date,e.category,e.description,"","","",e.amount]));downloadCSV(`westlake-year-${y}.csv`,rows)}
function exportBackup(){const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="westlake-cloud-backup.json";a.click();URL.revokeObjectURL(a.href)}
function downloadCSV(name,rows){const csv=rows.map(r=>r.map(v=>`"${String(v??"").replaceAll('"','""')}"`).join(",")).join("\n"),blob=new Blob([csv],{type:"text/csv"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;a.click();URL.revokeObjectURL(a.href)}
function sum(rows,key){return rows.reduce((s,r)=>s+Number(r[key]||0),0)}function year(d){const y=new Date(d).getFullYear();return Number.isFinite(y)?y:null}function today(){return new Date().toISOString().slice(0,10)}function addDays(n){const d=new Date();d.setDate(d.getDate()+n);return d.toISOString().slice(0,10)}function money(v){return Number(v||0).toLocaleString(undefined,{style:"currency",currency:"USD"})}function val(id){return byId(id)?.value||""}function setVal(id,v){const e=byId(id);if(e)e.value=v??""}function setText(id,v){const e=byId(id);if(e)e.textContent=v}function esc(v=""){return String(v).replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[ch]))}function attr(v=""){return esc(v).replaceAll("\n"," ")}
window.editJob=editJob;window.editDocument=editDocument;window.printRecord=printRecord;window.editCustomer=editCustomer;window.editEquipment=editEquipment;window.editExpense=editExpense;window.editService=editService;
