import * as THREE from 'three-full'

function disposeNode (node) {
  if (node instanceof THREE.Mesh) {
    if (node.geometry) {
      node.geometry.dispose ();
    }
    if (node.material) {
      if (node.material.map)          node.material.map.dispose ();
      if (node.material.lightMap)     node.material.lightMap.dispose ();
      if (node.material.bumpMap)      node.material.bumpMap.dispose ();
      if (node.material.normalMap)    node.material.normalMap.dispose ();
      if (node.material.specularMap)  node.material.specularMap.dispose ();
      if (node.material.envMap)       node.material.envMap.dispose ();
      node.material.dispose ();
    }
  }
}

export default function disposeHierarchy (node) {
  if (!node) return;
  if (!node.children) {
    disposeNode(node)
    return
  }
  for (var i = node.children.length - 1; i >= 0; i--) {
    var child = node.children[i];
    node.remove(child)
    disposeHierarchy (child);
    disposeNode (child);
  }
}
