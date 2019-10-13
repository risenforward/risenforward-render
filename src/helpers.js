import * as THREE from 'three'

function makeTextSprite (canvas, pos, size) {
  const texture = new THREE.CanvasTexture(canvas)
  texture.center = new THREE.Vector2(0.5, 0.5)
  texture.rotation = Math.PI

  const spriteMaterial = new THREE.SpriteMaterial({
    map: texture
  })
  const sprite = new THREE.Sprite(spriteMaterial)
  sprite.scale.set(size, size, size)
  sprite.position.set(pos.x, pos.y, pos.z)
  return sprite
}

export function addTextToGrid (gridX, gridY, gridSize, numSteps, labels) {
  const step = gridSize / numSteps
  const half = gridSize * 0.5
  for (let i = 0; i < numSteps + 1; ++i) {
    let text = makeTextSprite(
      labels[i],
      new THREE.Vector3(-half + step * i, 0, half * 1.1),
      half
    )
    gridX.add(text)
    text = text.clone()
    text.position.set(-half + step * i, 0, half * 1.1)
    gridY.add(text)
    text = text.clone()
    text.position.set(half * 1.1, 0, -half + i * step)
    gridY.add(text)
  }
}
