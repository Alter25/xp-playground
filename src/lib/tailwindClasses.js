const S = ['0','px','0.5','1','1.5','2','2.5','3','3.5','4','5','6','7','8','9','10','11','12','14','16','20','24','28','32','36','40','44','48','52','56','60','64','72','80','96']
const CN = ['slate','gray','zinc','neutral','stone','red','orange','amber','yellow','lime','green','emerald','teal','cyan','sky','blue','indigo','violet','purple','fuchsia','pink','rose']
const CK = ['50','100','200','300','400','500','600','700','800','900','950']
const COLORS = ['inherit','current','transparent','black','white',...CN.flatMap(c=>CK.map(k=>`${c}-${k}`))]

// prefix + values → "prefix-val" (empty val → just "prefix")
const p = (pre, vals) => vals.map(v => v === '' ? pre : `${pre}-${v}`)
// same but also generates negative variants like -m-4
const pn = (pre, vals) => [...p(pre, vals), ...vals.filter(v => !['','0','px','auto','full'].includes(v)).map(v => `-${pre}-${v}`)]

const CLASSES = [
  // Display
  'block','inline-block','inline','flex','inline-flex','table','inline-table',
  'table-caption','table-cell','table-column','table-column-group',
  'table-footer-group','table-header-group','table-row-group','table-row',
  'flow-root','grid','inline-grid','contents','list-item','hidden',

  // Position
  'static','fixed','absolute','relative','sticky',

  // Inset
  ...['inset','inset-x','inset-y','start','end','top','right','bottom','left']
    .flatMap(k => pn(k, [...S,'auto','full','1/2','1/3','2/3','1/4','3/4'])),

  // Visibility
  'visible','invisible','collapse',

  // Z-index
  ...p('z',['0','10','20','30','40','50','auto']),

  // Overflow
  ...['overflow','overflow-x','overflow-y']
    .flatMap(k => p(k, ['auto','hidden','clip','visible','scroll'])),

  // Box-sizing
  'box-border','box-content',

  // Float / Clear
  ...p('float',['start','end','right','left','none']),
  ...p('clear',['start','end','right','left','both','none']),

  // Object
  ...p('object',['contain','cover','fill','none','scale-down',
    'bottom','center','left','left-bottom','left-top','right','right-bottom','right-top','top']),

  // Aspect ratio
  'aspect-auto','aspect-square','aspect-video',

  // Columns
  ...p('columns',['1','2','3','4','5','6','7','8','9','10','11','12','auto',
    '3xs','2xs','xs','sm','md','lg','xl','2xl','3xl','4xl','5xl','6xl','7xl']),

  // Container
  'container',

  // Isolation
  'isolate','isolation-auto',

  // Flex
  'flex-row','flex-row-reverse','flex-col','flex-col-reverse',
  'flex-wrap','flex-wrap-reverse','flex-nowrap',
  ...p('flex',['1','auto','initial','none']),
  ...p('grow',['','0']),
  ...p('shrink',['','0']),
  ...p('basis',[...S,'auto','full','1/2','1/3','2/3','1/4','3/4']),

  // Grid
  ...p('grid-cols',['1','2','3','4','5','6','7','8','9','10','11','12','none','subgrid']),
  ...p('grid-rows',['1','2','3','4','5','6','7','8','9','10','11','12','none','subgrid']),
  'grid-flow-row','grid-flow-col','grid-flow-dense','grid-flow-row-dense','grid-flow-col-dense',
  ...p('col-span',['1','2','3','4','5','6','7','8','9','10','11','12','full']),
  ...p('row-span',['1','2','3','4','5','6','7','8','9','10','11','12','full']),
  ...p('col-start',['1','2','3','4','5','6','7','8','9','10','11','12','13','auto']),
  ...p('col-end',  ['1','2','3','4','5','6','7','8','9','10','11','12','13','auto']),
  ...p('row-start',['1','2','3','4','5','6','7','8','9','10','11','12','13','auto']),
  ...p('row-end',  ['1','2','3','4','5','6','7','8','9','10','11','12','13','auto']),
  'auto-cols-auto','auto-cols-min','auto-cols-max','auto-cols-fr',
  'auto-rows-auto','auto-rows-min','auto-rows-max','auto-rows-fr',

  // Alignment
  ...p('justify',['normal','start','end','center','between','around','evenly','stretch']),
  ...p('justify-items',['start','end','center','stretch']),
  ...p('justify-self',['auto','start','end','center','stretch']),
  ...p('items',['start','end','center','baseline','stretch']),
  ...p('self',['auto','start','end','center','stretch','baseline']),
  ...p('content',['normal','start','end','center','between','around','evenly','baseline','stretch']),
  ...p('place-content',['center','start','end','between','around','evenly','baseline','stretch']),
  ...p('place-items',['start','end','center','baseline','stretch']),
  ...p('place-self',['auto','start','end','center','stretch']),

  // Gap
  ...['gap','gap-x','gap-y'].flatMap(k => p(k, S)),

  // Space between
  ...['space-x','space-y'].flatMap(k => pn(k, S)),
  'space-x-reverse','space-y-reverse',

  // Padding
  ...['p','px','py','ps','pe','pt','pr','pb','pl'].flatMap(k => p(k, [...S,'auto'])),

  // Margin
  ...['m','mx','my','ms','me','mt','mr','mb','ml'].flatMap(k => pn(k, [...S,'auto'])),

  // Width
  ...p('w',[...S,'auto','full','screen','svw','lvw','dvw','min','max','fit',
    '1/2','1/3','2/3','1/4','2/4','3/4','1/5','2/5','3/5','4/5',
    '1/6','2/6','3/6','4/6','5/6','1/12','2/12','3/12','4/12','5/12',
    '6/12','7/12','8/12','9/12','10/12','11/12']),
  ...p('min-w',[...S,'full','min','max','fit','none']),
  ...p('max-w',[...S,'none','full','min','max','fit','prose',
    'xs','sm','md','lg','xl','2xl','3xl','4xl','5xl','6xl','7xl',
    'screen-sm','screen-md','screen-lg','screen-xl','screen-2xl']),

  // Height
  ...p('h',[...S,'auto','full','screen','svh','lvh','dvh','min','max','fit',
    '1/2','1/3','2/3','1/4','2/4','3/4','1/5','2/5','3/5','4/5','1/6','5/6']),
  ...p('min-h',[...S,'full','screen','svh','lvh','dvh','min','max','fit','none']),
  ...p('max-h',[...S,'none','full','screen','svh','lvh','dvh','min','max','fit']),

  // Size (w + h shorthand)
  ...p('size',[...S,'auto','full','min','max','fit','1/2','1/3','2/3','1/4','3/4']),

  // Typography — size
  ...p('text',['xs','sm','base','lg','xl','2xl','3xl','4xl','5xl','6xl','7xl','8xl','9xl']),
  // Typography — color
  ...p('text', COLORS),
  // Typography — align / wrap
  'text-left','text-center','text-right','text-justify','text-start','text-end',
  'text-wrap','text-nowrap','text-balance','text-pretty',
  'truncate','text-ellipsis','text-clip',
  // Font
  'antialiased','subpixel-antialiased','italic','not-italic',
  ...p('font',['thin','extralight','light','normal','medium','semibold','bold','extrabold','black',
    '100','200','300','400','500','600','700','800','900']),
  'font-sans','font-serif','font-mono',
  // Line-height
  ...p('leading',['3','4','5','6','7','8','9','10','none','tight','snug','normal','relaxed','loose']),
  // Letter-spacing
  ...p('tracking',['tighter','tight','normal','wide','wider','widest']),
  // Line-clamp
  ...p('line-clamp',['1','2','3','4','5','6','none']),
  // Lists
  'list-none','list-disc','list-decimal','list-inside','list-outside',
  // Transform
  'lowercase','uppercase','capitalize','normal-case',
  // Decoration
  'underline','overline','line-through','no-underline',
  ...p('decoration',['solid','double','dotted','dashed','wavy','0','1','2','4','8',...COLORS]),
  ...p('underline-offset',['auto','0','1','2','4','8']),
  // Vertical align
  ...p('align',['baseline','top','middle','bottom','text-top','text-bottom','sub','super']),
  // Whitespace / word-break
  'whitespace-normal','whitespace-nowrap','whitespace-pre','whitespace-pre-line',
  'whitespace-pre-wrap','whitespace-break-spaces',
  'break-normal','break-words','break-all','break-keep',
  'hyphens-none','hyphens-manual','hyphens-auto',

  // Background
  ...p('bg', COLORS),
  'bg-inherit','bg-transparent',
  'bg-fixed','bg-local','bg-scroll',
  'bg-clip-border','bg-clip-padding','bg-clip-content','bg-clip-text',
  'bg-none',
  ...p('bg',['gradient-to-t','gradient-to-tr','gradient-to-r','gradient-to-br',
    'gradient-to-b','gradient-to-bl','gradient-to-l','gradient-to-tl']),
  'bg-bottom','bg-center','bg-left','bg-left-bottom','bg-left-top',
  'bg-right','bg-right-bottom','bg-right-top','bg-top',
  'bg-no-repeat','bg-repeat','bg-repeat-x','bg-repeat-y','bg-repeat-round','bg-repeat-space',
  'bg-auto','bg-cover','bg-contain',
  ...p('from', COLORS),...p('via', COLORS),...p('to', COLORS),
  ...p('from-opacity',['0','5','10','15','20','25','30','35','40','45','50','55','60','65','70','75','80','85','90','95','100']),

  // Borders
  ...['border','border-x','border-y','border-s','border-e','border-t','border-r','border-b','border-l']
    .flatMap(k => [...p(k, ['','0','2','4','8']), ...p(k, COLORS)]),
  'border-solid','border-dashed','border-dotted','border-double','border-hidden','border-none',

  // Rounded
  ...['rounded','rounded-s','rounded-e','rounded-t','rounded-r','rounded-b','rounded-l',
    'rounded-ss','rounded-se','rounded-ee','rounded-es',
    'rounded-tl','rounded-tr','rounded-br','rounded-bl']
    .flatMap(k => p(k, ['none','sm','','md','lg','xl','2xl','3xl','full'])),

  // Divide
  ...['divide-x','divide-y'].flatMap(k => p(k, ['','0','2','4','8'])),
  'divide-x-reverse','divide-y-reverse',
  ...p('divide', COLORS),
  'divide-solid','divide-dashed','divide-dotted','divide-double','divide-none',

  // Outline
  ...p('outline',['','0','1','2','4','8',...COLORS]),
  'outline-none','outline-solid','outline-dashed','outline-dotted','outline-double',
  ...p('outline-offset',['0','1','2','4','8']),

  // Ring
  ...p('ring',['','0','1','2','4','8','inset',...COLORS]),
  ...p('ring-offset',['0','1','2','4','8',...COLORS]),

  // Shadow
  ...p('shadow',['','sm','md','lg','xl','2xl','inner','none',...COLORS]),

  // Opacity
  ...p('opacity',['0','5','10','15','20','25','30','35','40','45','50','55','60','65','70','75','80','85','90','95','100']),

  // Blend modes
  ...p('mix-blend',['normal','multiply','screen','overlay','darken','lighten',
    'color-dodge','color-burn','hard-light','soft-light','difference','exclusion',
    'hue','saturation','color','luminosity','plus-lighter','plus-darker']),
  ...p('bg-blend',['normal','multiply','screen','overlay','darken','lighten',
    'color-dodge','color-burn','hard-light','soft-light','difference','exclusion',
    'hue','saturation','color','luminosity']),

  // Filters
  ...p('blur',['','none','sm','md','lg','xl','2xl','3xl']),
  ...p('brightness',['0','50','75','90','95','100','105','110','125','150','200']),
  ...p('contrast',['0','50','75','100','125','150','200']),
  ...p('grayscale',['','0']),
  ...pn('hue-rotate',['0','15','30','60','90','180']),
  ...p('invert',['','0']),
  ...p('saturate',['0','50','100','150','200']),
  ...p('sepia',['','0']),
  ...p('drop-shadow',['','sm','md','lg','xl','2xl','none']),

  // Backdrop filters
  ...p('backdrop-blur',['','none','sm','md','lg','xl','2xl','3xl']),
  ...p('backdrop-brightness',['0','50','75','90','95','100','105','110','125','150','200']),
  ...p('backdrop-contrast',['0','50','75','100','125','150','200']),
  ...p('backdrop-grayscale',['','0']),
  ...pn('backdrop-hue-rotate',['0','15','30','60','90','180']),
  ...p('backdrop-invert',['','0']),
  ...p('backdrop-saturate',['0','50','100','150','200']),
  ...p('backdrop-sepia',['','0']),
  ...p('backdrop-opacity',['0','5','10','20','25','30','40','50','60','70','75','80','90','95','100']),

  // Transitions & animation
  ...p('transition',['','none','all','colors','opacity','shadow','transform']),
  ...p('duration',['0','75','100','150','200','300','500','700','1000']),
  ...p('ease',['linear','in','out','in-out']),
  ...p('delay',['0','75','100','150','200','300','500','700','1000']),
  'animate-none','animate-spin','animate-ping','animate-pulse','animate-bounce',

  // Transforms
  ...p('scale',['0','50','75','90','95','100','105','110','125','150','200']),
  ...p('scale-x',['0','50','75','90','95','100','105','110','125','150']),
  ...p('scale-y',['0','50','75','90','95','100','105','110','125','150']),
  ...pn('rotate',['0','1','2','3','6','12','45','90','180']),
  ...pn('translate-x',[...S,'full','1/2','1/3','2/3','1/4','3/4']),
  ...pn('translate-y',[...S,'full','1/2','1/3','2/3','1/4','3/4']),
  ...pn('skew-x',['0','1','2','3','6','12']),
  ...pn('skew-y',['0','1','2','3','6','12']),
  'transform','transform-cpu','transform-gpu','transform-none',
  ...p('origin',['center','top','top-right','right','bottom-right',
    'bottom','bottom-left','left','top-left']),

  // Interactivity
  ...p('cursor',['auto','default','pointer','wait','text','move','help','not-allowed','none',
    'context-menu','progress','cell','crosshair','vertical-text','alias','copy',
    'no-drop','grab','grabbing','all-scroll','col-resize','row-resize',
    'n-resize','e-resize','s-resize','w-resize','ne-resize','nw-resize',
    'se-resize','sw-resize','ew-resize','ns-resize','zoom-in','zoom-out']),
  ...p('select',['none','text','all','auto']),
  'resize-none','resize-y','resize-x','resize',
  'pointer-events-none','pointer-events-auto',
  'appearance-none','appearance-auto',
  'will-change-auto','will-change-scroll','will-change-contents','will-change-transform',

  // Scroll
  'scroll-auto','scroll-smooth',
  ...['scroll-m','scroll-mx','scroll-my','scroll-ms','scroll-me',
    'scroll-mt','scroll-mr','scroll-mb','scroll-ml'].flatMap(k => p(k, [...S,'auto'])),
  ...['scroll-p','scroll-px','scroll-py','scroll-ps','scroll-pe',
    'scroll-pt','scroll-pr','scroll-pb','scroll-pl'].flatMap(k => p(k, S)),
  'snap-start','snap-end','snap-center','snap-align-none',
  'snap-normal','snap-always',
  'snap-x','snap-y','snap-both','snap-none',
  'snap-mandatory','snap-proximity',
  ...p('overscroll',['auto','contain','none']),
  ...p('overscroll-x',['auto','contain','none']),
  ...p('overscroll-y',['auto','contain','none']),
  ...p('touch',['auto','none','pan-x','pan-left','pan-right','pan-y','pan-up','pan-down','pinch-zoom','manipulation']),

  // SVG
  ...p('fill', COLORS),...p('stroke', COLORS),
  ...p('stroke',['0','1','2']),

  // Accessibility
  'sr-only','not-sr-only',
]

const TAILWIND_CLASSES = [...new Set(CLASSES)].sort()
export default TAILWIND_CLASSES
