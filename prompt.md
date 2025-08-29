# main prompt
The australian government has a huge amount of open source data. That  data is available via api and i've dumped the conceptscheme as json in datasets/conceptscheme.json. I want to write an AI chat tool that helps users figure out which data sets might be useful to them through use of AI query. Once a few options of the correct data have been identified, the user should be able to query / view that dataset through the tool via the australian gov API 

https://data.api.abs.gov.au/rest/data/{dataflowIdentifier}/{dataKey}?startPeriod={date value}&endPeriod={date value}&detail={value}&dimensionAtObservation={value}


To do this, i plan to upload conceptscheme.json to azurefoundry as a vector store and write a small program in Vite + React 18 + TypeScript + Material-UI that will allow the user to query an azure foundry chatbot for which datasets might be meaningful to them.

 Write that step by step process for creating the described program program (assuming azure foundry with a vector store document has been set up already)  into a file called TODO.md