const KEY="westlakeTestApp.local.v1";
const defaultData={
 settings:{businessName:"Westlake Tree Experts",phone:"(610) 291-1176",email:"bwestlake@business.com",address:"30 Ivy Ln\nDouglassville, PA 19518",taxRate:6,invoiceTerms:"Payment due within 15 days.",paymentInstructions:"Please make checks payable to Westlake Tree Experts."},
 counters:{invoice:1001,estimate:1001,job:1001},
 customers:[],
 documents:[],
 jobs:[],
 services:[
  {id:"svc1",name:"Tree Removal",description:"Tree removal",price:0,category:"Tree Service",taxable:false},
  {id:"svc2",name:"Tree Pruning",description:"Tree pruning",price:0,category:"Tree Service",taxable:false},
  {id:"svc3",name:"Storm Cleanup",description:"Storm cleanup",price:0,category:"Tree Service",taxable:false},
  {id:"svc4",name:"Stump Grinding",description:"Stump grinding",price:0,category:"Tree Service",taxable:false},
  {id:"svc5",name:"Brush Removal",description:"Brush removal",price:0,category:"Tree Service",taxable:false},
  {id:"svc6",name:"Mulch Installation",description:"Mulch installation",price:0,category:"Landscaping",taxable:true}
 ],
 expenses:[]
};
let data=loadData(), jobFilter="upcoming", documentFilter="all", signatureData="", sigPad=null, sigCtx=null, drawing=false;

document.addEventListener("DOMContentLoaded",init);

function init(){
 bindEvents();initSignature();clearDocument("Estimate");clearCustomer();clearJob();clearService();loadSettingsForm();refreshAll();
 if("serviceWorker" in navigator)navigator.serviceWorker.register("service-worker.js").catch(()=>{});
}

function bindEvents(){
 document.querySelectorAll(".tab").forEach(b=>b.addEventListener("click",()=>showView(b.dataset.view)));
 document.querySelectorAll("[data-job-filter]").forEach(b=>b.addEventListener("click",()=>{document.querySelectorAll("[data-job-filter]").forEach(x=>x.classList.remove("active"));b.classList.add("active");jobFilter=b.dataset.jobFilter;renderJobs()}));
 on("homeNewEstimateBtn",()=>{clearDocument("Estimate");showView("documents")});
 on("quickNewInvoiceBtn",()=>{clearDocument("Invoice");showView("documents")});
 on("quickNewEstimateBtn",()=>{clearDocument("Estimate");showView("documents")});
 on("quickNewCustomerBtn",()=>{clearCustomer();showView("customers")});
 on("quickRecordPaymentBtn",recordPaymentPrompt);
 on("homeOpenInvoices",()=>showDocumentFilter("openInvoices"));
 on("homePaidInvoices",()=>showDocumentFilter("paidInvoices"));
 on("homeOpenEstimates",()=>showDocumentFilter("openEstimates"));
 on("homeJobsScheduled",()=>showJobsScheduled());
 on("homeRevenueMonth",()=>showView("reports"));
 on("clearCustomerBtn",clearCustomer);on("saveCustomerBtn",saveCustomer);on("deleteCustomerBtn",deleteCustomer);byId("customerSearch").addEventListener("input",renderCustomers);
 on("clearDocumentBtn",()=>clearDocument("Invoice"));on("saveDocumentBtn",saveDocument);on("deleteDocumentBtn",deleteDocument);on("addBlankLineBtn",()=>addLine());on("addServiceLineBtn",addServiceLine);on("convertToInvoiceBtn",convertToInvoice);on("scheduleJobBtn",scheduleJobFromEstimate);on("markPaidBtn",markCurrentPaid);on("printDocumentBtn",printCurrentDocument);on("clearSignatureBtn",clearSignature);
 byId("documentCustomer").addEventListener("change",fillDocumentCustomer);byId("documentType").addEventListener("change",()=>{if(!val("documentId"))setDocumentNumber(val("documentType"))});byId("documentApplyTax").addEventListener("change",calcDocTotals);byId("documentTaxRate").addEventListener("input",calcDocTotals);byId("documentSearch").addEventListener("input",renderDocuments);
 on("clearJobBtn",clearJob);on("saveJobBtn",saveJob);on("deleteJobBtn",deleteJob);on("completeJobBtn",completeJob);on("createInvoiceFromJobBtn",createInvoiceFromJob);
 on("saveSettingsBtn",saveSettings);
 on("saveServiceBtn",saveService);on("deleteServiceBtn",deleteService);
 byId("reportYear").addEventListener("change",renderReports);on("exportYearReportBtn",exportYearCSV);
 on("exportMarketingBtn",exportMarketingCSV);on("copyMarketingEmailsBtn",copyMarketingEmails);byId("exportOnlyMarketingOk").addEventListener("change",renderMarketing);
 on("exportBackupBtn",exportBackup);byId("importBackupFile").addEventListener("change",importBackup);on("clearAllBtn",clearAllData);
}

function on(id,fn){const e=byId(id);if(e)e.addEventListener("click",fn)}
function byId(id){return document.getElementById(id)}
function loadData(){try{return deepMerge(structuredClone(defaultData),JSON.parse(localStorage.getItem(KEY)||"{}"))}catch{return structuredClone(defaultData)}}
function saveData(){localStorage.setItem(KEY,JSON.stringify(data));refreshAll()}
function deepMerge(base,inc){for(const k in inc){if(inc[k]&&typeof inc[k]==="object"&&!Array.isArray(inc[k]))base[k]=deepMerge(base[k]||{},inc[k]);else base[k]=inc[k]}return base}
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,7)}
function showView(id){document.querySelectorAll(".view").forEach(v=>v.classList.remove("active"));document.querySelectorAll(".tab").forEach(t=>t.classList.toggle("active",t.dataset.view===id));byId(id).classList.add("active");if(id!=="documents"){documentFilter="all";resetDocumentFilterTitle()}refreshAll()}
function refreshAll(){renderOptions();renderHome();renderCustomers();renderDocuments();renderJobs();renderReports();renderServices();renderMarketing();renderHistory();loadSettingsForm()}
function renderOptions(){
 const cust='<option value="">Choose customer</option>'+data.customers.map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join("");
 ["documentCustomer","jobCustomer"].forEach(id=>byId(id).innerHTML=cust);
 byId("documentJob").innerHTML='<option value="">No linked job</option>'+data.jobs.map(j=>`<option value="${j.id}">${esc(j.number)} - ${esc(j.title)} - ${formatDate(j.date)}</option>`).join("");
 byId("jobEstimate").innerHTML='<option value="">No linked estimate</option>'+data.documents.filter(d=>d.type==="Estimate").map(d=>`<option value="${d.id}">${esc(d.number)} - ${esc(d.customerName||"")}</option>`).join("");
 byId("jobInvoice").innerHTML='<option value="">No linked invoice</option>'+data.documents.filter(d=>d.type==="Invoice").map(d=>`<option value="${d.id}">${esc(d.number)} - ${esc(d.customerName||"")}</option>`).join("");
 byId("servicePicker").innerHTML='<option value="">Choose service</option>'+data.services.map(s=>`<option value="${s.id}">${esc(s.name)} ${s.price?money(s.price):""}</option>`).join("");
}
function renderHome(){
 const now=new Date(),yr=now.getFullYear(),mo=now.getMonth();
 const paid=data.documents.filter(d=>d.type==="Invoice"&&d.status==="Paid");
 const monthRevenue=sum(paid.filter(d=>{const dt=parseLocalDate(d.date);return dt&&dt.getFullYear()===yr&&dt.getMonth()===mo}),"total");
 setText("homeRevenueMonth",money(monthRevenue));
 setText("homeOpenInvoices",data.documents.filter(d=>d.type==="Invoice"&&d.status!=="Paid").length);
 setText("homePaidInvoices",paid.length);
 setText("homeOpenEstimates",data.documents.filter(d=>d.type==="Estimate"&&!["Approved","Declined"].includes(d.status)).length);
 setText("homeJobsScheduled",data.jobs.filter(j=>["Scheduled","Upcoming","In Progress"].includes(j.status)).length);
 renderHomeLists();
}
function renderHomeLists(){
 byId("recentCustomersList").innerHTML=[...data.customers].slice(-5).reverse().map(c=>`<div class="list-item"><h4>${esc(c.name)}</h4><p>Last Service: ${formatDate(lastServiceDate(c.id))||"None yet"}</p><button onclick="editCustomer('${c.id}')">Open</button></div>`).join("")||"<p>No customers yet.</p>";
 byId("recentInvoicesList").innerHTML=data.documents.filter(d=>d.type==="Invoice").slice(-5).reverse().map(d=>`<div class="list-item"><h4>${esc(d.number)} • ${money(d.total)}</h4><p>${esc(d.customerName||"")} • ${formatDate(d.date)} • ${esc(d.status)}</p><button onclick="editDocument('${d.id}')">Open</button></div>`).join("")||"<p>No invoices yet.</p>";
 const end=addDays(7);
 byId("upcomingJobsList").innerHTML=data.jobs.filter(j=>j.date>=today()&&j.date<=end&&j.status!=="Completed"&&j.status!=="Cancelled").sort((a,b)=>a.date.localeCompare(b.date)).map(j=>`<div class="list-item"><h4>${formatDate(j.date)}</h4><p>${esc(j.customerName||"")} • ${esc(j.title)}</p><button onclick="editJob('${j.id}')">Open</button></div>`).join("")||"<p>No jobs in the next 7 days.</p>";
}

function showDocumentFilter(filter){
 documentFilter=filter;
 showView("documents");
 const label={openInvoices:"Open Invoices",paidInvoices:"Paid Invoices",openEstimates:"Open Estimates"}[filter]||"Invoices & Estimates";
 const search=byId("documentSearch"); if(search) search.value="";
 const title=document.querySelector("#documents h2"); if(title) title.textContent=label;
 renderDocuments();
}
function showJobsScheduled(){
 jobFilter="upcoming";
 document.querySelectorAll("[data-job-filter]").forEach(x=>x.classList.toggle("active",x.dataset.jobFilter==="upcoming"));
 showView("jobs");
 renderJobs();
}
function resetDocumentFilterTitle(){const title=document.querySelector("#documents h2"); if(title) title.textContent="Invoices & Estimates";}
function clearCustomer(){["customerId","customerName","customerPhone","customerEmail","customerBillingAddress","customerPropertyAddress","customerTags","customerNotes"].forEach(id=>setVal(id,""));byId("customerMarketingOk").checked=false}
function saveCustomer(){if(!val("customerName"))return alert("Customer name is required.");const id=val("customerId")||uid();const rec={id,name:val("customerName"),phone:val("customerPhone"),email:val("customerEmail"),billingAddress:val("customerBillingAddress"),propertyAddress:val("customerPropertyAddress"),tags:val("customerTags"),notes:val("customerNotes"),marketingOk:byId("customerMarketingOk").checked,updatedAt:new Date().toISOString()};const old=data.customers.find(x=>x.id===id);old?Object.assign(old,rec):data.customers.push(rec);saveData();clearCustomer()}
function editCustomer(id){const c=data.customers.find(x=>x.id===id);if(!c)return;setVal("customerId",c.id);setVal("customerName",c.name);setVal("customerPhone",c.phone);setVal("customerEmail",c.email);setVal("customerBillingAddress",c.billingAddress);setVal("customerPropertyAddress",c.propertyAddress);setVal("customerTags",c.tags);setVal("customerNotes",c.notes);byId("customerMarketingOk").checked=!!c.marketingOk;showView("customers")}
function deleteCustomer(){const id=val("customerId");if(!id)return alert("No customer selected.");if(confirm("Delete customer?")){data.customers=data.customers.filter(c=>c.id!==id);saveData();clearCustomer()}}
function renderCustomers(){const q=val("customerSearch").toLowerCase();byId("customerList").innerHTML=data.customers.filter(c=>JSON.stringify(c).toLowerCase().includes(q)).map(c=>{const lifetime=sum(data.documents.filter(d=>d.type==="Invoice"&&d.status==="Paid"&&d.customerId===c.id),"total");return`<div class="list-item"><h4>${esc(c.name)}</h4><p>${esc(c.phone||"")} ${esc(c.email||"")}</p><p><strong>Property:</strong> ${esc(c.propertyAddress||"")}</p><p><strong>Last Service:</strong> ${formatDate(lastServiceDate(c.id))||"None"}</p><p><strong>Total Lifetime Revenue:</strong> ${money(lifetime)}</p>${c.tags?`<p>${esc(c.tags)}</p>`:""}${c.marketingOk?'<span class="pill">Marketing OK</span>':''}<div class="row-actions"><button onclick="editCustomer('${c.id}')">Edit</button><button onclick="showCustomerHistory('${c.id}')">Customer History</button></div></div>`}).join("")||"<p>No customers yet.</p>"}
function lastServiceDate(customerId){const jobs=data.jobs.filter(j=>j.customerId===customerId&&j.status==="Completed").sort((a,b)=>(b.date||"").localeCompare(a.date||""));return jobs[0]?.date||""}
function showCustomerHistory(id){const c=data.customers.find(x=>x.id===id);const docs=data.documents.filter(d=>d.customerId===id).map(d=>`${formatDate(d.date)} • ${d.number} • ${d.type} • ${d.status} • ${money(d.total)}`);const jobs=data.jobs.filter(j=>j.customerId===id).map(j=>`${formatDate(j.date)} • ${j.number} • Job • ${j.status} • ${j.title}`);alert(`${c.name} History\n\n`+[...docs,...jobs].join("\n")||"No history yet.")}

function clearDocument(type="Invoice"){["documentId","documentCustomerName","documentCustomerPhone","documentCustomerEmail","documentBillingAddress","documentPropertyAddress","documentNotes"].forEach(id=>setVal(id,""));setVal("documentType",type);setVal("documentStatus",type==="Estimate"?"Pending Approval":"Draft");setVal("documentCustomer","");setVal("documentJob","");setDocumentNumber(type);setVal("documentDate",today());setVal("documentDueDate",addDays(type==="Estimate"?30:15));setVal("documentTerms",data.settings.invoiceTerms);setVal("documentPaymentInstructions",data.settings.paymentInstructions);byId("lineItems").innerHTML="";addLine();byId("documentApplyTax").checked=false;setVal("documentTaxRate",data.settings.taxRate);clearSignature();calcDocTotals()}
function setDocumentNumber(type){const prefix=type==="Estimate"?"EST":"INV";let max=1000;data.documents.filter(d=>d.type===type&&d.number).forEach(d=>{const m=String(d.number).match(/(\d+)$/);if(m)max=Math.max(max,Number(m[1]))});setVal("documentNumber",`${prefix}-${max+1}`)}
function fillDocumentCustomer(){const c=data.customers.find(x=>x.id===val("documentCustomer"));if(!c)return;setVal("documentCustomerName",c.name);setVal("documentCustomerPhone",c.phone);setVal("documentCustomerEmail",c.email);setVal("documentBillingAddress",c.billingAddress);setVal("documentPropertyAddress",c.propertyAddress)}
function addLine(desc="",amount="",serviceId="",serviceName="",category="Other",taxable=false){const row=document.createElement("div");row.className="line-item";row.dataset.serviceId=serviceId;row.dataset.serviceName=serviceName||desc;row.dataset.category=category;row.dataset.taxable=taxable?"true":"false";row.innerHTML=`<label>Description<input class="line-description" value="${attr(desc)}"></label><label>Amount<input class="line-amount" type="number" step="0.01" value="${amount}"></label><button class="danger" type="button">×</button>`;row.querySelector(".line-amount").addEventListener("input",calcDocTotals);row.querySelector("button").addEventListener("click",()=>{row.remove();calcDocTotals()});byId("lineItems").appendChild(row)}
function addServiceLine(){const s=data.services.find(x=>x.id===val("servicePicker"));if(!s)return alert("Choose a service.");addLine(s.description||s.name,s.price||"",s.id,s.name,s.category,!!s.taxable);if(s.taxable)byId("documentApplyTax").checked=true;calcDocTotals()}
function getLines(){return[...document.querySelectorAll("#lineItems .line-item")].map(r=>({description:r.querySelector(".line-description").value,amount:Number(r.querySelector(".line-amount").value||0),serviceId:r.dataset.serviceId,serviceName:r.dataset.serviceName||r.querySelector(".line-description").value,category:r.dataset.category||"Other",taxable:r.dataset.taxable==="true"})).filter(i=>i.description||i.amount)}
function calcDocTotals(){const items=getLines(),subtotal=sum(items,"amount"),tax=byId("documentApplyTax").checked?subtotal*(Number(val("documentTaxRate")||0)/100):0;setText("documentSubtotal",money(subtotal));setText("documentTax",money(tax));setText("documentTotal",money(subtotal+tax));return{subtotal,tax,total:subtotal+tax}}
function saveDocument(){const type=val("documentType"),totals=calcDocTotals();let number=val("documentNumber")||nextNumber(type);if(!val("documentId")&&data.documents.some(d=>d.type===type&&d.number===number))number=nextNumber(type);const id=val("documentId")||uid();const old=data.documents.find(x=>x.id===id);const existingPayments=old?.payments||[];const rec={id,type,status:val("documentStatus"),customerId:val("documentCustomer"),customerName:val("documentCustomerName"),customerPhone:val("documentCustomerPhone"),customerEmail:val("documentCustomerEmail"),billingAddress:val("documentBillingAddress"),propertyAddress:val("documentPropertyAddress"),jobId:val("documentJob"),number,date:val("documentDate"),dueDate:val("documentDueDate"),items:getLines(),applyTax:byId("documentApplyTax").checked,taxRate:Number(val("documentTaxRate")||0),subtotal:totals.subtotal,tax:totals.tax,total:totals.total,payments:existingPayments,amountPaid:sum(existingPayments,"amount"),balanceDue:Math.max(0,totals.total-sum(existingPayments,"amount")),notes:val("documentNotes"),terms:val("documentTerms"),paymentInstructions:val("documentPaymentInstructions"),signature:signatureData,updatedAt:new Date().toISOString()};if(rec.type==="Invoice"&&rec.balanceDue<=0&&rec.payments.length)rec.status="Paid";else if(rec.type==="Invoice"&&rec.amountPaid>0)rec.status="Partial Payment";old?Object.assign(old,rec):data.documents.push(rec);ensureCustomerFromDocument(rec);saveData();setVal("documentId",id);alert(`${type} saved.`)}
function nextNumber(type){const prefix=type==="Estimate"?"EST":"INV";let max=1000;data.documents.filter(d=>d.type===type&&d.number).forEach(d=>{const m=String(d.number).match(/(\d+)$/);if(m)max=Math.max(max,Number(m[1]))});return`${prefix}-${max+1}`}
function ensureCustomerFromDocument(d){if(d.customerId||!d.customerName)return;const existing=data.customers.find(c=>c.name.toLowerCase()===d.customerName.toLowerCase());if(existing){d.customerId=existing.id;return}data.customers.push({id:uid(),name:d.customerName,phone:d.customerPhone,email:d.customerEmail,billingAddress:d.billingAddress,propertyAddress:d.propertyAddress,tags:"",notes:"",marketingOk:false,updatedAt:new Date().toISOString()})}
function editDocument(id){const d=data.documents.find(x=>x.id===id);if(!d)return;setVal("documentId",d.id);setVal("documentType",d.type);setVal("documentStatus",d.status);setVal("documentCustomer",d.customerId||"");setVal("documentJob",d.jobId||"");setVal("documentCustomerName",d.customerName);setVal("documentCustomerPhone",d.customerPhone);setVal("documentCustomerEmail",d.customerEmail);setVal("documentBillingAddress",d.billingAddress);setVal("documentPropertyAddress",d.propertyAddress);setVal("documentNumber",d.number);setVal("documentDate",d.date);setVal("documentDueDate",d.dueDate);setVal("documentNotes",d.notes);setVal("documentTerms",d.terms||data.settings.invoiceTerms);setVal("documentPaymentInstructions",d.paymentInstructions||data.settings.paymentInstructions);byId("lineItems").innerHTML="";(d.items||[]).forEach(i=>addLine(i.description,i.amount,i.serviceId,i.serviceName,i.category,i.taxable));byId("documentApplyTax").checked=!!d.applyTax;setVal("documentTaxRate",d.taxRate);signatureData=d.signature||"";restoreSignature();calcDocTotals();showView("documents")}
function deleteDocument(){const id=val("documentId");if(!id)return alert("No document selected.");if(confirm("Delete document?")){data.documents=data.documents.filter(d=>d.id!==id);saveData();clearDocument("Invoice")}}
function convertToInvoice(){const d=data.documents.find(x=>x.id===val("documentId")&&x.type==="Estimate");if(!d)return alert("Open a saved estimate first.");const copy=structuredClone(d);copy.id=uid();copy.type="Invoice";copy.status="Draft";copy.number=nextNumber("Invoice");copy.date=today();copy.dueDate=addDays(15);copy.signature="";data.documents.push(copy);saveData();editDocument(copy.id)}
function markCurrentPaid(){const d=data.documents.find(x=>x.id===val("documentId"));if(!d)return alert("Open a saved invoice first.");d.status="Paid";saveData();editDocument(d.id)}
function getAmountPaid(d){return sum(d.payments||[],"amount")}
function getBalanceDue(d){return Math.max(0,Number(d.total||0)-getAmountPaid(d))}
function recordPaymentPrompt(){
 const unpaid=data.documents.filter(d=>d.type==="Invoice"&&getBalanceDue(d)>0&&d.status!=="Paid");
 if(!unpaid.length)return alert("No unpaid invoices.");
 const list=unpaid.map((d,i)=>`${i+1}) ${d.customerName||"No Customer"} — ${d.number} — Balance Due ${money(getBalanceDue(d))}`).join("\n");
 const choice=prompt(`Choose invoice to record payment:\n\n${list}\n\nEnter number:`,"1");
 const d=unpaid[Number(choice)-1]; if(!d)return alert("Invoice not found.");
 const amt=Number(prompt(`${d.customerName||"No Customer"} — ${d.number}\nBalance Due: ${money(getBalanceDue(d))}\n\nPayment amount:`,getBalanceDue(d).toFixed(2)));
 if(!amt||amt<=0)return alert("Payment not recorded.");
 d.payments=d.payments||[];
 d.payments.push({id:uid(),date:today(),amount:Math.min(amt,getBalanceDue(d)),note:"Recorded payment"});
 d.amountPaid=getAmountPaid(d);
 d.balanceDue=getBalanceDue(d);
 d.status=d.balanceDue<=0?"Paid":"Partial Payment";
 saveData();
 alert(`${d.customerName||"Customer"} — ${d.number} updated. Balance due: ${money(d.balanceDue)}.`);
}

function scheduleJobFromEstimate(){const d=data.documents.find(x=>x.id===val("documentId")&&x.type==="Estimate");if(!d)return alert("Open a saved estimate first.");const date=prompt("Service date in YYYY-MM-DD format:",today());if(!date)return;const job={id:uid(),number:nextJobNumber(),customerId:d.customerId,customerName:d.customerName,estimateId:d.id,invoiceId:"",title:d.items?.[0]?.description||"Scheduled Job",status:"Scheduled",date,startTime:"",endTime:"",crew:"Westlake Crew",location:d.propertyAddress||d.billingAddress,notes:`Scheduled from ${d.number}`,updatedAt:new Date().toISOString()};data.jobs.push(job);d.status="Approved";saveData();editJob(job.id);alert(`Job scheduled for ${formatDate(date)}.`)}
function renderDocuments(){
 const q=val("documentSearch").toLowerCase();
 let rows=data.documents.filter(d=>JSON.stringify(d).toLowerCase().includes(q));
 if(documentFilter==="openInvoices")rows=rows.filter(d=>d.type==="Invoice"&&d.status!=="Paid"&&getBalanceDue(d)>0);
 if(documentFilter==="paidInvoices")rows=rows.filter(d=>d.type==="Invoice"&&d.status==="Paid");
 if(documentFilter==="openEstimates")rows=rows.filter(d=>d.type==="Estimate"&&! ["Approved","Declined"].includes(d.status));
 byId("documentList").innerHTML=rows.slice().reverse().map(d=>{
  const paid=getAmountPaid(d),bal=getBalanceDue(d);
  const moneyLine=d.type==="Invoice"?`Total: ${money(d.total)} • Paid: ${money(paid)} • Balance: ${money(bal)}`:`Total: ${money(d.total)}`;
  return `<div class="list-item"><h4>${esc(d.number)} • ${esc(d.type)} <span class="pill ${String(d.status).toLowerCase().replaceAll(" ","-")}">${esc(d.status)}</span></h4><p><strong>${esc(d.customerName||"")}</strong> • ${formatDate(d.date)}</p><p>${moneyLine}</p><div class="row-actions"><button onclick="editDocument('${d.id}')">Open</button><button onclick="printRecord('${d.id}')">PDF</button></div></div>`
 }).join("")||"<p>No matching invoices or estimates.</p>"
}


function clearJob(){["jobId","jobTitle","jobStartTime","jobEndTime","jobCrew","jobLocation","jobNotes"].forEach(id=>setVal(id,""));setVal("jobCustomer","");setVal("jobEstimate","");setVal("jobInvoice","");setVal("jobStatus","Scheduled");setVal("jobDate",today())}
function nextJobNumber(){let max=1000;data.jobs.forEach(j=>{const m=String(j.number||"").match(/(\d+)$/);if(m)max=Math.max(max,Number(m[1]))});return`JOB-${max+1}`}
function saveJob(){const c=data.customers.find(x=>x.id===val("jobCustomer"));const est=data.documents.find(d=>d.id===val("jobEstimate"));if(!val("jobTitle"))return alert("Job title required.");const id=val("jobId")||uid();const rec={id,number:data.jobs.find(j=>j.id===id)?.number||nextJobNumber(),customerId:val("jobCustomer")||est?.customerId||"",customerName:c?.name||est?.customerName||"",estimateId:val("jobEstimate"),invoiceId:val("jobInvoice"),title:val("jobTitle"),status:val("jobStatus"),date:val("jobDate"),startTime:val("jobStartTime"),endTime:val("jobEndTime"),crew:val("jobCrew"),location:val("jobLocation"),notes:val("jobNotes"),updatedAt:new Date().toISOString()};const old=data.jobs.find(j=>j.id===id);old?Object.assign(old,rec):data.jobs.push(rec);saveData();clearJob()}
function editJob(id){const j=data.jobs.find(x=>x.id===id);if(!j)return;setVal("jobId",j.id);setVal("jobCustomer",j.customerId);setVal("jobEstimate",j.estimateId);setVal("jobInvoice",j.invoiceId);setVal("jobTitle",j.title);setVal("jobStatus",j.status);setVal("jobDate",j.date);setVal("jobStartTime",j.startTime);setVal("jobEndTime",j.endTime);setVal("jobCrew",j.crew);setVal("jobLocation",j.location);setVal("jobNotes",j.notes);showView("jobs")}
function deleteJob(){const id=val("jobId");if(!id)return alert("No job selected.");if(confirm("Delete job?")){data.jobs=data.jobs.filter(j=>j.id!==id);saveData();clearJob()}}
function completeJob(){const j=data.jobs.find(x=>x.id===val("jobId"));if(!j)return alert("Open a job first.");j.status="Completed";j.notes=val("jobNotes");saveData();editJob(j.id)}
function createInvoiceFromJob(){const j=data.jobs.find(x=>x.id===val("jobId"));if(!j)return alert("Open a job first.");const est=data.documents.find(d=>d.id===j.estimateId);if(est){const inv=structuredClone(est);inv.id=uid();inv.type="Invoice";inv.status="Draft";inv.number=nextNumber("Invoice");inv.date=today();inv.dueDate=addDays(15);inv.jobId=j.id;inv.signature="";data.documents.push(inv);j.invoiceId=inv.id;saveData();editDocument(inv.id)}else{clearDocument("Invoice");setVal("documentCustomer",j.customerId);fillDocumentCustomer();setVal("documentJob",j.id);showView("documents")}}
function renderJobs(){let rows=[...data.jobs];if(jobFilter==="upcoming")rows=rows.filter(j=>j.date>=today()&&j.status!=="Completed"&&j.status!=="Cancelled").sort((a,b)=>a.date.localeCompare(b.date));if(jobFilter==="completed")rows=rows.filter(j=>j.status==="Completed").sort((a,b)=>b.date.localeCompare(a.date));if(jobFilter==="calendar"){const groups={};rows.sort((a,b)=>a.date.localeCompare(b.date)).forEach(j=>{groups[j.date]=groups[j.date]||[];groups[j.date].push(j)});byId("jobList").innerHTML=Object.entries(groups).map(([date,jobs])=>`<div class="list-item"><h4>${formatDate(date)}</h4>${jobs.map(j=>`<p>${esc(j.customerName||"")} • ${esc(j.title)} • ${esc(j.status)}</p><button onclick="editJob('${j.id}')">Open</button>`).join("")}</div>`).join("")||"<p>No jobs.</p>";return}byId("jobList").innerHTML=rows.map(j=>`<div class="list-item"><h4>${esc(j.number)} • ${esc(j.title)} <span class="pill">${esc(j.status)}</span></h4><p>${formatDate(j.date)} • ${esc(j.customerName||"")} • ${esc(j.crew||"")}</p><p>${esc(j.location||"")}</p><button onclick="editJob('${j.id}')">Open</button></div>`).join("")||"<p>No jobs.</p>"}

function renderReports(){const years=[...new Set([new Date().getFullYear(),...data.documents.map(d=>year(d.date)).filter(Boolean),...data.jobs.map(j=>year(j.date)).filter(Boolean)])].sort((a,b)=>b-a);const sel=byId("reportYear"),cur=sel.value||years[0];sel.innerHTML=years.map(y=>`<option value="${y}">${y}</option>`).join("");sel.value=years.includes(Number(cur))?cur:years[0];const y=Number(sel.value),invoices=data.documents.filter(d=>d.type==="Invoice"&&year(d.date)===y),paid=invoices.filter(d=>d.status==="Paid"),unpaid=invoices.filter(d=>d.status!=="Paid"),expenses=data.expenses.filter(e=>year(e.date)===y);const revenue=sum(paid,"total"),expenseTotal=sum(expenses,"amount");setText("reportRevenue",money(revenue));setText("reportOutstanding",money(sum(unpaid,"total")));setText("reportTaxable",money(sum(paid.filter(d=>d.applyTax),"subtotal")));setText("reportTax",money(sum(paid,"tax")));setText("reportNonTaxable",money(sum(paid.filter(d=>!d.applyTax),"subtotal")));setText("reportPaidUnpaid",`${paid.length} / ${unpaid.length}`);setText("reportExpenses",money(expenseTotal));setText("reportNet",money(revenue-expenseTotal));const months=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],byMonth=Array(12).fill(0);paid.forEach(d=>{const dt=parseLocalDate(d.date);if(dt)byMonth[dt.getMonth()]+=Number(d.total||0)});const max=Math.max(...byMonth,1);byId("monthlyBars").innerHTML=byMonth.map((t,i)=>`<div class="bar-row"><span>${months[i]}</span><div class="bar" style="width:${Math.max(4,t/max*100)}%"></div><strong>${money(t)}</strong></div>`).join("");const bySvc={},byCat={},byCust={};paid.forEach(d=>{byCust[d.customerName||"Unknown"]=(byCust[d.customerName||"Unknown"]||0)+Number(d.total||0);(d.items||[]).forEach(i=>{bySvc[i.serviceName||i.description||"Other"]=(bySvc[i.serviceName||i.description||"Other"]||0)+Number(i.amount||0);byCat[i.category||"Other"]=(byCat[i.category||"Other"]||0)+Number(i.amount||0)})});byId("serviceRevenueReport").innerHTML=reportRows(bySvc);byId("categoryRevenueReport").innerHTML=reportRows(byCat);byId("topCustomersReport").innerHTML=reportRows(byCust,5)}
function reportRows(obj,limit=999){const rows=Object.entries(obj).sort((a,b)=>b[1]-a[1]).slice(0,limit);return rows.map(([n,t])=>`<div class="list-item"><h4>${esc(n)}</h4><p>${money(t)}</p></div>`).join("")||"<p>No data yet.</p>"}

function clearService(){["serviceId","serviceName","servicePrice","serviceCategory","serviceDescription"].forEach(id=>setVal(id,""));byId("serviceTaxable").checked=false}
function saveService(){if(!val("serviceName"))return alert("Service name required.");const id=val("serviceId")||uid();const rec={id,name:val("serviceName"),price:Number(val("servicePrice")||0),category:val("serviceCategory")||"Other",taxable:byId("serviceTaxable").checked,description:val("serviceDescription")};const old=data.services.find(s=>s.id===id);old?Object.assign(old,rec):data.services.push(rec);saveData();clearService()}
function editService(id){const s=data.services.find(x=>x.id===id);if(!s)return;setVal("serviceId",s.id);setVal("serviceName",s.name);setVal("servicePrice",s.price);setVal("serviceCategory",s.category);byId("serviceTaxable").checked=!!s.taxable;setVal("serviceDescription",s.description);showView("settings")}
function deleteService(){const id=val("serviceId");if(!id)return alert("No service selected.");if(confirm("Delete service?")){data.services=data.services.filter(s=>s.id!==id);saveData();clearService()}}
function renderServices(){byId("serviceList").innerHTML=data.services.map(s=>`<div class="list-item"><h4>${esc(s.name)} • ${money(s.price)}</h4><p>${esc(s.category||"Other")} ${s.taxable?'<span class="pill">Taxable</span>':'<span class="pill">Non-taxable</span>'}</p><p>${esc(s.description||"")}</p><button onclick="editService('${s.id}')">Edit</button></div>`).join("")||"<p>No services yet.</p>"}
function loadSettingsForm(){setVal("settingsBusinessName",data.settings.businessName);setVal("settingsPhone",data.settings.phone);setVal("settingsEmail",data.settings.email);setVal("settingsAddress",data.settings.address);setVal("settingsTaxRate",data.settings.taxRate);setVal("settingsInvoiceTerms",data.settings.invoiceTerms);setVal("settingsPaymentInstructions",data.settings.paymentInstructions)}
function saveSettings(){data.settings={businessName:val("settingsBusinessName"),phone:val("settingsPhone"),email:val("settingsEmail"),address:val("settingsAddress"),taxRate:Number(val("settingsTaxRate")||6),invoiceTerms:val("settingsInvoiceTerms"),paymentInstructions:val("settingsPaymentInstructions")};saveData();alert("Settings saved.")}
function renderMarketing(){const only=byId("exportOnlyMarketingOk").checked,rows=data.customers.filter(c=>c.email&&(!only||c.marketingOk));byId("marketingList").innerHTML=rows.map(c=>`<div class="list-item"><h4>${esc(c.name)}</h4><p>${esc(c.email)}</p></div>`).join("")||"<p>No contacts ready.</p>"}
function exportMarketingCSV(){const only=byId("exportOnlyMarketingOk").checked,rows=[["FIRSTNAME","LASTNAME","EMAIL","SMS","ADDRESS","MARKETING_OK"]];data.customers.filter(c=>c.email&&(!only||c.marketingOk)).forEach(c=>{const p=String(c.name||"").split(/\s+/),first=p.shift()||"";rows.push([first,p.join(" "),c.email,c.phone,c.billingAddress,c.marketingOk?"yes":"no"])});downloadCSV("westlake-brevo-contacts.csv",rows)}
async function copyMarketingEmails(){const emails=data.customers.filter(c=>c.email&&(!byId("exportOnlyMarketingOk").checked||c.marketingOk)).map(c=>c.email).join(", ");if(!emails)return alert("No emails.");try{await navigator.clipboard.writeText(emails);alert("Copied.")}catch{prompt("Copy emails:",emails)}}
function renderHistory(){byId("historyList").innerHTML=[...data.documents,...data.jobs].slice(-50).reverse().map(r=>`<div class="list-item"><h4>${esc(r.number||"Record")}</h4><p>${esc(r.customerName||"")} • ${formatDate(r.date)} • ${esc(r.status||"")}</p></div>`).join("")||"<p>No history yet.</p>"}
function exportBackup(){downloadFile("westlake-test-backup.json",JSON.stringify(data,null,2),"application/json")}
function importBackup(e){const file=e.target.files[0];if(!file)return;const reader=new FileReader();reader.onload=()=>{try{data=deepMerge(structuredClone(defaultData),JSON.parse(reader.result));saveData();alert("Backup imported.")}catch{alert("Invalid backup.")}};reader.readAsText(file)}
function clearAllData(){if(confirm("Clear all test data on this device?")){localStorage.removeItem(KEY);location.reload()}}
function exportYearCSV(){const y=Number(val("reportYear")),rows=[["TYPE","DATE","NUMBER","CUSTOMER","STATUS","SUBTOTAL","TAX","TOTAL"]];data.documents.filter(d=>year(d.date)===y).forEach(d=>rows.push([d.type,d.date,d.number,d.customerName,d.status,d.subtotal,d.tax,d.total]));downloadCSV(`westlake-test-year-${y}.csv`,rows)}

function printCurrentDocument(){const d=data.documents.find(x=>x.id===val("documentId"));if(!d)return alert("Open or save a document first.");printRecord(d.id)}
function printRecord(id){const d=data.documents.find(x=>x.id===id);if(!d)return;const s=data.settings;byId("printArea").innerHTML=`<div class="print-document"><div class="print-header"><div><img class="print-logo" src="logo.png"><p><strong>${esc(s.businessName)}</strong><br>${esc(s.phone)}<br>${esc(s.email)}<br>${esc(s.address).replaceAll("\n","<br>")}</p></div><div class="print-title"><h2>${esc(d.type).toUpperCase()}</h2><p><strong># ${esc(d.number)}</strong><br>Date: ${formatDate(d.date)}<br>Due: ${formatDate(d.dueDate)}<br>Status: ${esc(d.status)}</p></div></div><p><strong>Customer:</strong> ${esc(d.customerName||"")}<br>${esc(d.billingAddress||"").replaceAll("\n","<br>")}<br>${esc(d.customerPhone||"")}<br>${esc(d.customerEmail||"")}</p><p><strong>Property:</strong><br>${esc(d.propertyAddress||"").replaceAll("\n","<br>")}</p><table class="print-table"><thead><tr><th>Description</th><th>Amount</th></tr></thead><tbody>${(d.items||[]).map(i=>`<tr><td>${esc(i.description)}</td><td>${money(i.amount)}</td></tr>`).join("")}</tbody></table><div class="print-totals"><div><span>Subtotal</span><strong>${money(d.subtotal)}</strong></div><div><span>Tax</span><strong>${money(d.tax)}</strong></div><div class="grand"><span>Total</span><strong>${money(d.total)}</strong></div></div>${d.notes?`<h3>Notes</h3><p>${esc(d.notes).replaceAll("\n","<br>")}</p>`:""}${d.terms?`<h3>Terms</h3><p>${esc(d.terms).replaceAll("\n","<br>")}</p>`:""}${d.paymentInstructions?`<h3>Payment Instructions</h3><p>${esc(d.paymentInstructions).replaceAll("\n","<br>")}</p>`:""}${d.type==="Invoice"?`<h3>Payment Summary</h3><p>Total: ${money(d.total)}<br>Paid: ${money(getAmountPaid(d))}<br><strong>Balance Due: ${money(getBalanceDue(d))}</strong></p>`:""}${d.signature?`<h3>Customer Approval</h3><img class="signature-img" src="${d.signature}">`:""}</div>`;setTimeout(()=>print(),100)}
function initSignature(){sigPad=byId("signaturePad");if(!sigPad)return;sigCtx=sigPad.getContext("2d");sigCtx.lineWidth=3;sigCtx.lineCap="round";["mousedown","touchstart"].forEach(e=>sigPad.addEventListener(e,startDraw,{passive:false}));["mousemove","touchmove"].forEach(e=>sigPad.addEventListener(e,draw,{passive:false}));["mouseup","mouseleave","touchend"].forEach(e=>sigPad.addEventListener(e,endDraw,{passive:false}))}
function pos(e){const r=sigPad.getBoundingClientRect(),p=e.touches?e.touches[0]:e;return{x:(p.clientX-r.left)*(sigPad.width/r.width),y:(p.clientY-r.top)*(sigPad.height/r.height)}}
function startDraw(e){e.preventDefault();drawing=true;const p=pos(e);sigCtx.beginPath();sigCtx.moveTo(p.x,p.y)}
function draw(e){if(!drawing)return;e.preventDefault();const p=pos(e);sigCtx.lineTo(p.x,p.y);sigCtx.stroke()}
function endDraw(){if(!drawing)return;drawing=false;signatureData=sigPad.toDataURL("image/png")}
function clearSignature(){if(!sigCtx)return;sigCtx.clearRect(0,0,sigPad.width,sigPad.height);signatureData=""}
function restoreSignature(){clearSignature();if(!signatureData)return;const img=new Image();img.onload=()=>sigCtx.drawImage(img,0,0,sigPad.width,sigPad.height);img.src=signatureData}

function downloadCSV(name,rows){downloadFile(name,rows.map(r=>r.map(v=>`"${String(v??"").replaceAll('"','""')}"`).join(",")).join("\n"),"text/csv")}
function downloadFile(name,content,type){const blob=new Blob([content],{type}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;a.click();URL.revokeObjectURL(a.href)}
function parseLocalDate(s){if(!s)return null;const p=String(s).split("-");if(p.length===3)return new Date(Number(p[0]),Number(p[1])-1,Number(p[2]));const d=new Date(s);return Number.isFinite(d.getTime())?d:null}
function formatDate(s){const d=parseLocalDate(s);return d?d.toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"}):""}
function today(){return new Date().toISOString().slice(0,10)}
function addDays(n){const d=new Date();d.setDate(d.getDate()+n);return d.toISOString().slice(0,10)}
function year(s){const d=parseLocalDate(s);return d?d.getFullYear():null}
function sum(rows,key){return rows.reduce((t,r)=>t+Number(r[key]||0),0)}
function money(v){return Number(v||0).toLocaleString(undefined,{style:"currency",currency:"USD"})}
function val(id){return byId(id)?.value||""}
function setVal(id,v){const e=byId(id);if(e)e.value=v??""}
function setText(id,v){const e=byId(id);if(e)e.textContent=v}
function esc(v=""){return String(v).replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[ch]))}
function attr(v=""){return esc(v).replaceAll("\n"," ")}
window.editCustomer=editCustomer;window.showCustomerHistory=showCustomerHistory;window.editDocument=editDocument;window.printRecord=printRecord;window.editJob=editJob;window.editService=editService;
