/* orim · core/templates.js
 * Starter boards, written as Mermaid.
 */
'use strict';
function boardCode(title,cols){
  const S=160,G=24,PADX=24,PADT=40,PADB=24,per=2,colW=PADX*2+per*S+(per-1)*G,gap=72;
  const L=['---','title: '+title,'---','flowchart LR'],styles=[],pos=[]; let x=0;
  const maxRows=Math.max(...cols.map(c=>Math.ceil(c.notes.length/per)))+1;
  const colH=PADT+maxRows*S+(maxRows-1)*G+PADB;
  cols.forEach(c=>{
    L.push('  subgraph '+c.id+' ['+c.label+']');
    c.notes.forEach(([text,color],i)=>{
      const id=c.id+(i+1); L.push('    '+id+'["'+text+'"]:::sticky'); styles.push('  style '+id+' fill:'+color);
      pos.push('%% @pos '+id+' '+(x+PADX+(i%per)*(S+G))+' '+(PADT+Math.floor(i/per)*(S+G)));
    });
    L.push('  end'); pos.push('%% @pos '+c.id+' '+x+' 0 '+colW+' '+colH); x+=colW+gap;
  });
  return L.join('\n')+'\n\n'+styles.join('\n')+'\n  classDef sticky stroke-width:0px,color:#1d2026\n\n%% layout: canvas positions and drawings kept by the visual editor\n'+pos.join('\n')+'\n';
}
const TEMPLATES=[
{id:'inspect',tint:'#f1e6f4',name:'Field inspections',desc:'Power Apps, Dataverse and Azure services',code:`---
title: Field inspections
---
flowchart LR
  inspector@{ icon: "azure:users", label: "Field inspector" }
  subgraph pp [Power Platform]
    app@{ icon: "pp:power-apps", label: "Inspection app" }
    copilot@{ icon: "pp:copilot-studio", label: "Inspection agent" }
    dv@{ icon: "pp:dataverse", label: "Dataverse" }
    flow@{ icon: "pp:power-automate", label: "Approval flow" }
  end
  subgraph az [Azure]
    apim@{ icon: "azure:api-management-services", label: "API Management" }
    fn@{ icon: "azure:function-apps", label: "Scoring function" }
    sb@{ icon: "azure:azure-service-bus", label: "Service Bus" }
    sql@{ icon: "azure:sql-database", label: "Reporting DB" }
    kv@{ icon: "azure:key-vaults", label: "Key Vault" }
  end
  bi@{ icon: "pp:power-bi", label: "Quality report" }

  inspector --> app
  inspector -.->|asks| copilot
  app -->|saves| dv
  copilot --> dv
  dv -->|row added| flow
  flow -->|custom connector| apim
  apim --> fn
  fn --> sb
  sb --> sql
  fn -.-> kv
  sql --> bi
`},
{id:'webapp',tint:'#e3f0fb',name:'Azure web application',desc:'Front Door, App Service, Functions, SQL',code:`---
title: Azure web application
---
flowchart LR
  user@{ icon: "azure:users", label: "Customers" }
  entra@{ icon: "azure:entra-id", label: "Entra ID" }
  fd@{ icon: "azure:front-door-and-cdn-profiles", label: "Front Door" }
  subgraph rg [Resource group: prod]
    subgraph vnet [Virtual network]
      web@{ icon: "azure:app-services", label: "Web app" }
      api@{ icon: "azure:function-apps", label: "Orders API" }
      sql@{ icon: "azure:sql-database", label: "Orders DB" }
    end
    kv@{ icon: "azure:key-vaults", label: "Key Vault" }
    st@{ icon: "azure:storage-accounts", label: "Blob storage" }
    ai@{ icon: "azure:application-insights", label: "App Insights" }
  end

  user --> fd
  user -.->|sign in| entra
  fd --> web
  web --> api
  api --> sql
  api --> st
  web -.->|secrets| kv
  api -.-> ai
`},
{id:'events',tint:'#e4f4ee',name:'Event-driven orders',desc:'Service Bus, Functions, Cosmos DB, Logic Apps',code:`---
title: Order events
---
flowchart LR
  shop@{ icon: "azure:app-services", label: "Shop" }
  apim@{ icon: "azure:api-management-services", label: "API gateway" }
  sb@{ icon: "azure:azure-service-bus", label: "orders topic" }
  subgraph workers [Processing]
    pay@{ icon: "azure:function-apps", label: "Payment" }
    ship@{ icon: "azure:function-apps", label: "Shipping" }
  end
  cosmos@{ icon: "azure:azure-cosmos-db", label: "Order store" }
  eg@{ icon: "azure:event-grid-topics", label: "Event Grid" }
  la@{ icon: "azure:logic-apps", label: "Notify customer" }
  bi@{ icon: "pp:power-bi", label: "Sales dashboard" }

  shop --> apim --> sb
  sb --> pay
  sb --> ship
  pay --> cosmos
  ship --> cosmos
  cosmos -.->|change feed| eg
  eg --> la
  cosmos ==> bi
`},
{id:'flow',tint:'#fbf3dc',name:'Approval flowchart',desc:'Plain shapes, decisions and colors',code:`---
title: Expense approval
---
flowchart TD
  start([Expense submitted]) --> check{Over 500 EUR?}
  check -->|No| auto[Auto-approve]
  check -->|Yes| mgr[Manager review]
  mgr --> ok{Approved?}
  ok -->|Yes| pay[(Payroll)]
  ok -->|No| reject[Notify employee]
  auto --> pay

  style check fill:#fff3b0,stroke:#d4ac0d
  style ok fill:#fff3b0,stroke:#d4ac0d
  style reject fill:#fbd7d4,stroke:#d24f44
  style pay fill:#d3f0dc,stroke:#36a064
`},
{id:'retro',tint:'#fdeef2',name:'Retrospective',desc:'Went well, to improve, action items',code:boardCode('Sprint retrospective',[
  {id:'well',label:'What went well',notes:[['Release shipped on time','#d5f692'],['Pairing on the API','#d5f692'],['Fewer incidents this sprint','#93d275'],['Clear sprint goal','#fff9b1']]},
  {id:'improve',label:'What could be better',notes:[['Too many meetings','#ffcee0'],['Flaky tests in CI','#f0939d'],['Unclear owner for the Dataverse schema','#ff9d48'],['Late design changes','#ffcee0']]},
  {id:'actions',label:'Action items',notes:[['Timebox standup to 15 min','#a6ccf5'],['Fix the 3 flakiest tests','#a6ccf5'],['Name a schema owner','#9ea9ff']]}])},
{id:'ssc',tint:'#eef6e2',name:'Start, stop, continue',desc:'Three columns of sticky notes',code:boardCode('Start, stop, continue',[
  {id:'start',label:'Start',notes:[['Demo to users every sprint','#d5f692'],['Write ADRs for big decisions','#c9df56']]},
  {id:'stop',label:'Stop',notes:[['Merging without review','#f0939d'],['Ad-hoc prod fixes','#ffcee0']]},
  {id:'continue',label:'Continue',notes:[['Friday knowledge share','#a6ccf5'],['Small pull requests','#6cd8fa'],['Pair on hard bugs','#fff9b1']]}])},
{id:'pp',name:'Power Platform solution',desc:'Apps, Dataverse, flows, agents and reports',tint:'#f1e6f4',code:`---
title: Power Platform solution
---
flowchart LR
  users@{ icon: "azure:users", label: "Employees" }
  entra@{ icon: "azure:entra-id", label: "Entra ID" }
  subgraph env [Power Platform environment]
    app@{ icon: "pp:power-apps", label: "Canvas app" }
    portal@{ icon: "pp:power-pages", label: "Partner portal" }
    agent@{ icon: "pp:copilot-studio", label: "Help agent" }
    dv@{ icon: "pp:dataverse", label: "Dataverse" }
    flow@{ icon: "pp:power-automate", label: "Cloud flows" }
    bi@{ icon: "pp:power-bi", label: "Reports" }
  end
  gw@{ icon: "azure:on-premises-data-gateways", label: "Data gateway" }
  erp[(On-prem ERP)]

  users --> app
  users --> agent
  users -.->|sign in| entra
  app --> dv
  portal --> dv
  agent --> dv
  dv -->|row changed| flow
  flow --> gw
  gw --> erp
  dv ==> bi
`},
{id:'data',name:'Analytics pipeline',desc:'Ingest, lake, transform and report',tint:'#e3f0fb',code:`---
title: Analytics pipeline
---
flowchart LR
  subgraph sources [Sources]
    iot@{ icon: "azure:event-hubs", label: "Event Hubs" }
    crm@{ icon: "pp:dataverse", label: "Dataverse" }
    sql@{ icon: "azure:sql-database", label: "Sales DB" }
  end
  adf@{ icon: "azure:data-factories", label: "Data Factory" }
  subgraph lake [Data lake]
    raw@{ icon: "azure:storage-accounts", label: "Raw" }
    curated@{ icon: "azure:storage-accounts", label: "Curated" }
  end
  dbx@{ icon: "azure:azure-databricks", label: "Databricks" }
  syn@{ icon: "azure:azure-synapse-analytics", label: "Synapse" }
  bi@{ icon: "pp:power-bi", label: "Dashboards" }

  iot --> adf
  crm --> adf
  sql --> adf
  adf --> raw
  raw --> dbx
  dbx --> curated
  curated --> syn
  syn ==> bi
`},
{id:'kanban',name:'Kanban board',desc:'To do, in progress, done',tint:'#fff6cc',code:boardCode('Sprint board',[
  {id:'todo',label:'To do',notes:[['Write the onboarding guide','#fff9b1'],['Set up Dataverse tables','#fff9b1'],['Design the approval flow','#fff9b1'],['Collect report requirements','#fff9b1']]},
  {id:'doing',label:'In progress',notes:[['Build the inspection app','#a6ccf5'],['Custom connector for the API','#a6ccf5']]},
  {id:'done',label:'Done',notes:[['Environment created','#d5f692'],['Security roles agreed','#d5f692'],['Kick-off meeting','#d5f692']]}])},
{id:'brainstorm',name:'Brainstorm',desc:'One topic, ideas around it',tint:'#fdeef2',code:`---
title: Brainstorm
---
flowchart LR
  topic((New hire onboarding))
  n1["Welcome video from the team"]:::sticky
  n2["Buddy for the first month"]:::sticky
  n3["Laptop ready on day one"]:::sticky
  n4["Checklist app in Power Apps"]:::sticky
  n5["Weekly check-in with the lead"]:::sticky
  n6["Short quiz after week one"]:::sticky

  topic --- n1
  topic --- n2
  topic --- n3
  topic --- n4
  topic --- n5
  topic --- n6

  style topic fill:#1a1a1a,color:#ffffff,font-size:18px,font-weight:bold
  style n1 fill:#fff9b1
  style n2 fill:#ffcee0
  style n3 fill:#a6ccf5
  style n4 fill:#d5f692
  style n5 fill:#f5d128
  style n6 fill:#c6a2d2
  classDef sticky stroke-width:0px,color:#1d2026

%% layout: canvas positions and drawings kept by the visual editor
%% @pos topic 384 264 200 200
%% @pos n1 96 40
%% @pos n2 404 -136
%% @pos n3 712 40
%% @pos n4 712 448
%% @pos n5 404 624
%% @pos n6 96 448
%% @route 0 straight
%% @route 1 straight
%% @route 2 straight
%% @route 3 straight
%% @route 4 straight
%% @route 5 straight
`},
{id:'blank',name:'Blank board',desc:'Start from an empty flowchart',code:`flowchart LR
`}];
