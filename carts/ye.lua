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
told=0

function TIC()
 t=t+1

 if t<show then
  cls(t%16<8 and 0 or 15)
  rect(104,46,32,26,12)
  rect(116,34,8,14,4)
  return
 end

 local dx=lx-px
 if dx<0 then dx=-dx end
 local dy=ly-py
 if dy<0 then dy=-dy end
 local near=dx<22 and dy<30

 cls(0)
 rect(0,112,240,24,15)
 rect(0,108,240,4,14)

 local body=9
 local cap=14
 if lit then
  body=4
  cap=12
 elseif near and t%24<12 then
  cap=4
 end
 if lit then circ(lx+1,ly+8,16,4) end
 rect(lx-8,ly,18,26,body)
 rect(lx-3,ly-12,8,14,cap)
 if lit then print("OK",lx-6,ly-24,4) end

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

 dx=lx-px
 if dx<0 then dx=-dx end
 dy=ly-py
 if dy<0 then dy=-dy end
 near=dx<22 and dy<30
 local far=dx+dy
 if far>64 then far=64 end
 rect(8,8,64,4,14)
 rect(8,8,64-far,4,lit and 4 or 11)

 if lit then
  if told~=1 then
   told=1
   trace("~on")
  end
 elseif miss then
  print("x",8,16,2)
  if told~=2 then
   told=2
   trace("~miss")
  end
 elseif near then
  if told~=3 then
   told=3
   trace("~cold")
  end
 end
end
