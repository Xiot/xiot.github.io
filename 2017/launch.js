const {DateTime, Duration} = luxon;

const statsJsonUri = 'https://portal.xiot.ca/aoc/2017/stats.json';
const overrideUri = year => `https://portal.xiot.ca/aoc/${year}/overrides.json`

window.onload = load;

const ZONE_NAME = 'America/Toronto';
const YEAR = 2017;

function load() {
  fetch(statsJsonUri)
    .then(x => x.json())
    .then(x => Object.values(x.members).map(lastDayAttempted))
    .then(initialize);
}

function initialize(members) {
  const container = document.getElementById('container')
  container.classList.remove('loading');
  
  const userId = getUserId();
  if (!userId) {
    append(container, collectUser(members));
    return;
  }

  const user = members.find(x => x.id === userId);
  const userName = user?.name ?? getUserName();
  const usersLastDay = user?.lastDay ?? 0

  append(container, div({}, 
    div({style: 'margin-bottom: 12px'}, 
      [
        div({}, `Welcome ${userName}`),
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

  let selectedDay = usersLastDay + 1;
  const daySelector = createDaySelect(YEAR, selectedDay, user?.daysComplete ?? [], e => {
    const day = e.target.value;
    const el = document.getElementById('launch');
    el.remove();
    
    container.append(createLauncher(YEAR, day))
  })
  append(container, daySelector)

  append(container, createLauncher(YEAR, selectedDay));  
}



function createDaySelect(year, value, disabledValues, onChange) {  
  
  const container = div({style: 'margin-bottom: 12px'}, [
    text('Day: '),
    node('select', {onchange: onChange}, range(25)
      .filter(x => !disabledValues.includes(x + 1))
      .map(x => node('option', {
        value: String(x + 1), 
        selected: (value -1) === x ? 'selected' : undefined,
        
      }, [text(String(x + 1))])))
  ])
  return container;
}

const USER_KEY = 'user.id';
const USER_NAME_KEY = 'user.name';
function getUserId() {
  return window.localStorage.getItem(USER_KEY);
}
function setUserId(name) {
  window.localStorage.setItem(USER_KEY, name);
}
function clearUser() {
  window.localStorage.removeItem(USER_KEY);
  window.localStorage.removeItem(USER_NAME_KEY);
}
function getUserName() {
  return window.localStorage.getItem(USER_NAME_KEY);
}
function setUserName(name) {
  window.localStorage.setItem(USER_NAME_KEY, name);
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
          node('option', {value: m.id}, text(m.name))
        )
      ),
      node('button', {onclick: () => {
        const el = document.getElementById('select-member');
        setUserId(el.value);
        
        const node = Array.from(el.children).find(x => x.value === el.value);        
        setUserName(node?.innerText);

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

  if (currentTime.toMillis() > unlockTime.toMillis()) {
    append(container, node('button', {onclick: () => {
      launch(2017, day);
    }}, text(`Launch Day ${day}`)))
  } else {
    const countDown = node('span', {}, text(`Day ${day} unlocks ` + unlockTime.toRelative()))
    setInterval(() => {
      countDown.innerText = `Day ${day} unlocks ` + unlockTime.toRelative();

      if (unlockTime.diffNow().as('seconds') < 0) {
        window.location.reload();
      }
    }, 1000);
    append(container, countDown);
  }

  return container;
}

function launch(year, day) {
  reportTime(getUserId(), year, day, Date.now());
  const uri = `https://adventofcode.com/${year}/day/${day}`
  window.open(uri);
}

function reportTime(user, year, day, time) {
  return fetch(overrideUri(year), {
    method: 'PATCH',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      user,
      day,
      time
    })
  })
  .then(response => response.json())
  .then(data => console.log(data));
}

function lastDayAttempted(member) {
  const lastDayIndex = range(25).reverse().findIndex(x => member.completion_day_level[String(x +1)]);
  return {
    id: member.id,
    name: member.name,
    lastDay: lastDayIndex === -1 ? 0 : 25 - lastDayIndex,
    daysComplete: Object.keys(member.completion_day_level).map(x => parseInt(x))
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
      } else if (value != null) {
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