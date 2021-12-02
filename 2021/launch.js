const {DateTime, Duration} = luxon;

const statsJsonUri = 'https://portal.xiot.ca/aoc-2021.json';

window.onload = load;

// const name = 'Chris Thomas';
const ZONE_NAME = 'America/Toronto';

function load() {
  const members = fetch(statsJsonUri)
    .then(x => x.json())
    .then(x => Object.values(x.members).map(lastDayAttempted))
    .then(initialize);
}

function initialize(members) {
  const container = document.getElementById('container')
  container.classList.remove('loading');
  
  const name = getUser();
  if (!name) {
    append(container, collectUser(members));
    return;
  }

  const usersLastDay = members.find(x => x.name === name)?.lastDay ?? 0

  append(container, div({}, 
    div({}, 
      [
        text(`Welcome ${name}`),
        node('a', { 
          href: 'launch.html',
          onclick: () => {
            clearUser();
            window.location.reload();
            return false;
          }}, 
          text('not you?'))
      ]
    )
  ));
  
  append(container, createLauncher(2021, usersLastDay+1 ));  
}

function getUser() {
  return window.localStorage.getItem('name');
}
function setUser(name) {
  window.localStorage.setItem('name', name);
}
function clearUser() {
  window.localStorage.removeItem('name');
}

function collectUser(members) {
  const container = div(
    {}, 
    [
      div({}, text('Who are you?')),
      node('select', 
        {
          id: 'select-member',         
        }, 
        members.sort((l, r) => l.name - r.name).map(m => 
          node('option', {value: m.name}, text(m.name))
        )
      ),
      node('button', {onclick: () => {
        const el = document.getElementById('select-member');
        setUser(el.value);
        window.location.reload();
        
      }}, text('Select'))
    ]
  );
  return container;
}

function createLauncher(year, day) {
  const container = div({id: 'launch'});

  const unlockTime = DateTime.fromObject({year, month: 12, day}, {zone: ZONE_NAME});
  const currentTime = DateTime.now().setZone(ZONE_NAME);
  console.log('unlock', unlockTime);

  if (currentTime.toMillis() > unlockTime.toMillis()) {
    append(container, node('button', {onclick: () => {
      launch(2021, day);
    }}, text(`Launch Day ${day}`)))
  } else {
    const countDown = node('span', {}, text(unlockTime.toRelative()))
    setInterval(() => {
      countDown.innerText = unlockTime.toRelative();
    }, 1000);
    append(container, countDown);
  }

  return container;
}

function launch(year, day) {
  const uri = `https://adventofcode.com/${year}/day/${day}`
  window.open(uri);
}

function reportTime(name, year, day, time) {
  return Promise.resolve();
}

function lastDayAttempted(member) {
  const lastDayIndex = range(25).reverse().findIndex(x => member.completion_day_level[String(x +1)]);
  return {
    name: member.name,
    lastDay: lastDayIndex === -1 ? 0 : 25 - lastDayIndex
  }
}

function range(to) {
  return Array.from(new Array(to), (x, i) => i)
}


function text(value) {
  return document.createTextNode(String(value));
}

function node(tag, props, children) {
  const el = document.createElement(tag);
  props && Object.entries(props).forEach(([key, value]) => {
      if (key.startsWith('on')) {
          el[key] = value;
      } else if (key === 'style' && typeof value !== 'string') {
          Object.entries(value).forEach(([key, value]) =>
              el.style[key] = value
          )
      } else {
          el.setAttribute(key, value);
      }
  });
  children && append(el, children);
  return el;
}

function div(props, children) {
  return node('div', props, children);
}

function append(target, children) {
  if (!children) return;
  if (typeof children === 'string')
      target.appendChild(text(children));
  else if (Array.isArray(children))
      children.forEach(c => target.appendChild(c));
  else
      target.appendChild(children);
}