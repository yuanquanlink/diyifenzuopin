-- title:  night
-- script: lua
-- input:  gamepad

t=0
show=70
step=3
px=64
py=104
lx=188
ly=90
lit=false
miss=false

function TIC()
 t=t+1

 if t<show then
  cls(t%16<8 and 0 or 15)
  rect(104,46,32,26,12)
  rect(116,34,8,14,4)
  return
 end

 cls(0)
 rect(0,112,240,24,15)
 rect(0,108,240,4,14)
 rect(lx-8,ly,18,26,lit and 4 or 9)
 rect(lx-3,ly-12,8,14,lit and 12 or 14)
 circ(px,py-16,5,12)
 rect(px-4,py-10,8,12,3)

 if px<18 then px=18 end
 if px>224 then px=224 end
 if py<80 then py=80 end
 if py>116 then py=116 end

 -- if held(2) then px=px-step end
 -- if held(3) then px=px+step end
 -- if held(0) then py=py-step end
 -- if held(1) then py=py+step end
 -- if tap(4) and touch(lx) then lamp=1 end

 local dx=lx-px
 if dx<0 then dx=-dx end
 local dy=ly-py
 if dy<0 then dy=-dy end
 local far=dx+dy
 if far>64 then far=64 end
 rect(8,8,64,4,14)
 rect(8,8,64-far,4,lit and 4 or 11)

 if lit then
  print("!",8,16,4)
 elseif miss then
  print("x",8,16,2)
 end
end
