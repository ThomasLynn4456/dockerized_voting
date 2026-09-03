// Floating particles

const container=document.getElementById("particles");

for(let i=0;i<70;i++){

const p=document.createElement("div");

p.className="particle";

p.style.left=Math.random()*100+"%";

p.style.animationDuration=(4+Math.random()*6)+"s";

p.style.animationDelay=Math.random()*5+"s";

p.style.opacity=Math.random();

container.appendChild(p);

}

// Vote Button

document
.getElementById("voteBtn")
.addEventListener("click",()=>{

window.location.href="home.html";

});