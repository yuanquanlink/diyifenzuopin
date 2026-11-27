-- title:  night
-- script: lua
-- input:  gamepad

t=0
show=90
px=78
py=104
lx=176
ly=86
lit=false
miss=false

function TIC()
 t=t+1
 local flash = t%36<10
 cls(flash and 1 or 0)

 if t<show then
  rect(100,44,40,32,flash and 12 or 1)
  rect(114,32,12,14,flash and 4 or 0)
  print("...",112,86,12)
  return
 end

 rect(0,112,240,24,15)
 rect(0,108,240,4,14)
 rect(lx-8,ly,18,26,lit and 4 or 8)
 rect(lx-3,ly-12,8,14,lit and 12 or 14)
 circ(px,py-16,5,12)
 rect(px-4,py-10,8,12,3)

 if px<18 then px=18 end
 if px>224 then px=224 end
 if py<80 then py=80 end
 if py>116 then py=116 end

 -- if held(2) then px=px-1 end
 -- if held(3) then px=px+1 end
 -- if held(0) then py=py-1 end
 -- if held(1) then py=py+1 end
 -- if tap(4) and touch(lx) then lamp=1 end

 if flash then print("...",8,8,13) end
 if lit then
  print("!",8,8,4)
 elseif miss then
  print("x",8,8,2)
 end
end
