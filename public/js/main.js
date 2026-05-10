
async function getCharaters(){
    const response = await fetch(`./api/characters`);
    const data = await response.json();
    
    console.log(data);
}

getCharaters();