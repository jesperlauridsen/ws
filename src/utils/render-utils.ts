import * as THREE from 'three';

export function nonBloomed(
  obj: THREE.Object3D,
  bloomLayer: THREE.Layers,
  materials: Map<THREE.Mesh, THREE.Material>,
) {
  if ((obj as THREE.Mesh).isMesh && bloomLayer.test(obj.layers) === false) {
    const mesh = obj as THREE.Mesh;

    // Only replace material if not already replaced
    if (!Array.isArray(mesh.material)) {
      if (!materials.has(mesh)) {
        materials.set(mesh, mesh.material);
      }

      const original = mesh.material as THREE.MeshPhongMaterial;
      const t = 1 - original.opacity;
      const color = new THREE.Color(0x000000).lerp(new THREE.Color(0xffff00), t);

      mesh.material = new THREE.MeshBasicMaterial({ color });
    }
  }
}

export function restoreMaterial(obj: THREE.Object3D, materials: Map<THREE.Mesh, THREE.Material>) {
  const mesh = obj as THREE.Mesh;
  if (materials.has(mesh)) {
    mesh.material = materials.get(mesh)!;
    materials.delete(mesh);
  }
}
