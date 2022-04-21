import { Canvas, useFrame, useThree, extend } from "@react-three/fiber";
import FPSStats from "react-fps-stats"
import {
  PerspectiveCamera,
  OrbitControls,
  useTexture,
} from "@react-three/drei";
import Head from "next/head";
import React from "react";
import {
  EffectComposer,
  GammaCorrectionShader,
  RGBShiftShader,
  RenderPass,
  ShaderPass,
  UnrealBloomPass,
} from "three-stdlib";
import { MeshStandardMaterial } from "three";
import CustomShaderMaterial from "three-custom-shader-material";

import { teModel } from "../data/leds";

const fragmentShader = `
float aastep(in float threshold, in float value) {
  float afwidth = length(vec2(dFdx(value), dFdy(value))) * 0.70710678118654757;
  return 1.0 - smoothstep(threshold-afwidth, threshold+afwidth, value);
}

void main() {
  float lw = 1.0;
  float w;

  float gx = 1.0 + cos(vUv.x * 24.0 * 2.0 * PI - PI);
  w = fwidth(vUv.x) * lw;
  gx = aastep(w, gx);

  float gy = 1.0 + cos(vUv.y * 24.0 * 2.0 * PI - PI);
  w = fwidth(vUv.y) * lw;
  gy = aastep(w, gy);

  float grid = gx + gy;
  
  csm_DiffuseColor = vec4(grid, grid * 0.3, grid * 0.5, 1.0);
}
`;

/**
 * Lots of great examples on how to handle effects are available at: https://onion2k.github.io/r3f-by-example
 */

// Read more about extend at https://docs.pmnd.rs/react-three-fiber/api/objects#using-3rd-party-objects-declaratively
extend({ EffectComposer, RenderPass, ShaderPass, UnrealBloomPass });

/**
 * This component renders the terrain composed of:
 * - a plane geometry
 * - a mesh standard material where we added:
 *   - a displacementMap for the topography
 *   - a texture for the grid
 *   - a metalnessMap for the reflective parts
 */
const Terrain = React.forwardRef((props, ref) => {
  const { z } = props;
  const materialRef = React.useRef();

  const [heightTexture, metalnessTexture] = useTexture([
    "displacement-7.png",
    "metalness-2.png",
  ]);

  return (
    <mesh ref={ref} position={[0, 0, z]} rotation={[-Math.PI * 0.5, 0, 0]}>
      <planeBufferGeometry arrach="geometry" args={[1, 2, 24, 24]} />
      <CustomShaderMaterial
        ref={materialRef}
        baseMaterial={MeshStandardMaterial}
        fragmentShader={fragmentShader}
        displacementMap={heightTexture}
        displacementScale={0.4}
        metalnessMap={metalnessTexture}
        metalness={0.9}
        roughness={0.5}
      />
    </mesh>
  );
});

Terrain.displayName = "Terrain";

/**
 * This component renders the landscape:
 * - 2 Terrains behing one one another
 * - each terrain moves along the z axis creating an "endless moving animation"
 */
const Landscape = () => {
  const terrain1Ref = React.useRef();
  const terrain2Ref = React.useRef();

  useFrame((state) => {
    // Update plane position
    terrain1Ref.current.position.z = (state.clock.elapsedTime * 0.15) % 2;
    terrain2Ref.current.position.z = ((state.clock.elapsedTime * 0.15) % 2) - 2;
  });

  return (
    <>
      <Terrain ref={terrain1Ref} z={0} />
      <Terrain ref={terrain2Ref} z={-2} />
    </>
  );
};

/**
 * This component renders the post-processing effects we're using for this scene:
 * - a RGBShift
 * - an UnrealBloom pass
 * - a GammaCorrection to fix the colors
 *
 * Note: I had to set the Canvas linear prop to true to make effects work!
 * See the canva API for more info: https://docs.pmnd.rs/react-three-fiber/api/canvas
 */
const Effects = () => {
  const composerRef = React.useRef();
  const rgbShiftRef = React.useRef();
  const { gl, scene, camera, size } = useThree();

  React.useEffect(() => {
    composerRef?.current.setSize(size.width, size.height);
  }, [size]);

  useFrame(() => {
    if (rgbShiftRef.current) {
      rgbShiftRef.current.uniforms["amount"].value = 0.0012;
    }
    composerRef.current.render();
  }, 1);

  return (
    <effectComposer ref={composerRef} args={[gl]}>
      <renderPass attachArray="passes" scene={scene} camera={camera} />
      <shaderPass
        ref={rgbShiftRef}
        attachArray="passes"
        args={[RGBShiftShader]}
      />
      <shaderPass attachArray="passes" args={[GammaCorrectionShader]} />
      <unrealBloomPass
        attachArray="passes"
        args={[size.width / size.height, 0.2, 0.8, 0]}
      />
    </effectComposer>
  );
};

/**
 * This component renders the Light of the scene which is composed of:
 * - 2 spotlights of high intensity positioned right behind the camera
 * - each spotlight aims at a specific target on opposite sides of the landscapes
 */
const Light = () => {
  const spotlight1Ref = React.useRef();
  const spotlight2Ref = React.useRef();

  spotlight1Ref.current?.target.position.set([-0.25, 0.25, 0.25]);
  spotlight2Ref.current?.target.position.set([0.25, 0.25, 0.25]);

  return (
    <>
      <spotLight
        ref={spotlight1Ref}
        color="#d53c3d"
        intensity={40}
        position={[0.5, 0.75, 2.1]}
        distance={25}
        angle={Math.PI * 0.1}
        penumbra={0.25}
        decay={10}
      />
      <spotLight
        ref={spotlight2Ref}
        color="#d53c3d"
        intensity={40}
        position={[-0.5, 0.75, 2.1]}
        distance={25}
        angle={Math.PI * 0.1}
        penumbra={0.25}
        decay={10}
      />
    </>
  );
};
import * as THREE from "three"
import { ShaderMaterial } from "three";
import { SVGLoader as loader } from "three/examples/jsm/loaders/SVGLoader";

function addSphere(scene, x, y, z) {
  let geometry = new THREE.SphereGeometry( 5, 32, 32 );
  let material = new THREE.MeshStandardMaterial({color: 0x0000ff, roughness: 0});
  let sphere = new THREE.Mesh( geometry, material );
  sphere.position.set(x, y, z);
  // sphere.name = 'my-sphere';
  scene.add( sphere );
}

function getSVG(url) {
  return new Promise(resolve =>
    new loader().load(url, shapes =>
      resolve(
        flatten(
          shapes.paths.map((group, index) => {
            return group.toShapes(true)
          })
        )
      )
    )
  )
}

const COLORS = {
  codGray: new THREE.Color(0x121212),
  brightTurquoise: new THREE.Color(0x39f5e6),
  wewak: new THREE.Color(0xffd8bb),
  mandy: new THREE.Color(0xe84971),
}

function Shape() {
  const [shapes, setShapes] = React.useState();
  const groupRef = React.useRef();

  React.useEffect(() => {
    getSVG(
      "https://raw.githubusercontent.com/willgriffiths/storage/master/vaporwave/onisun-1x1.svg"
    ).then(payload => setShapes(payload))
    groupRef.current.scale.multiply(new THREE.Vector3(5, -5, 1))
    groupRef.current.translateOnAxis(new THREE.Vector3(-1, 1, 0), 2.5)
  }, [])

  return (
    <group ref={groupRef}>
      {shapes &&
        shapes.map((shape, i) => (
          <mesh key={i} material={sunMaterial}>
            <shapeBufferGeometry attach="geometry" args={[shape]} />
          </mesh>
        ))}
    </group>
  )
}
export class SunHaloMaterial extends ShaderMaterial {
  constructor(options) {
    super({
      vertexShader: `
        varying vec2 vUv;
    
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 color;
      
        varying vec2 vUv;

        void main() {
          float d = 0.0;
          d = length( abs(vUv)-.5 );
          gl_FragColor = vec4(color, smoothstep(0.1,.5,d)* smoothstep(.5,.3,d))*0.75;
        }
      `,
      transparent: true,
    })
    this.uniforms = {
      color: { value: options.color },
    }
  }
}

var sunHaloMaterial = new SunHaloMaterial({
  color: COLORS.mandy,
})

function Sun() {
  return (
    <group position={[0, 4.5, 0]} scale={[1.15, 1.15, 1]}>
      <mesh material={sunHaloMaterial} position={[0, 0, -0.001]}>
        <ringBufferGeometry attach="geometry" args={[.1, 3.8, 36]} />
      </mesh>
      <Shape />
    </group>
  )
}

const normalScale = 1.5;
const skipLeds = 10;
const maxPerPanel = 3000;
const maxPanels = 200;
const ledSize = .004;
const edgeLedSize = .009;

const ledColor = new THREE.Color(0x39f5e6);

function Panel(props) {
  const { panel, ledSize, ledColor } = props;
  
  return panel.leds.map((ledPos, i) => {
    // if (ledPos[0] > .4) { return; }
    if (i > maxPerPanel) { return; }
    if (skipLeds !== false && i % skipLeds != 0) { return; }
    const x = ledPos[2]*normalScale * -1 + .7;
    const y = ledPos[1]*normalScale;
    const z = ledPos[0]*normalScale * -1 + 5;
    return (<mesh key={i} position={[x, y, z]}>
      <sphereGeometry attach="geometry" args={[ledSize, 3, 2]} />
      {/* <boxGeometry attach="geometry" args={[ledSize, ledSize, ledSize]} /> */}
      <meshBasicMaterial color={ledColor} />
    </mesh>);
  })
}

function Panels(props) {
  const { selected } = props;
  const primaryColor = new THREE.Color(selected.colors.primary);
  const edgeColor = new THREE.Color(selected.colors.edge);
  return (
    <group position={[0, 0, 0]} scale={[0.15, 0.15, .08]}>

      {teModel.panels.map((panel, i) => {
        if (Object.keys(selected).length > 1 && !!!selected[panel.id]) {
          return;
        }
        if (i > maxPanels) { return; }
        return <Panel key={i} panel={panel} ledSize={ledSize} ledColor={primaryColor} />;
      })}

      {teModel.edges.map((edge, i) => {
        if (i > maxPanels) { return; }
        return <Panel key={i} panel={edge} ledSize={edgeLedSize} ledColor={edgeColor} />;
      })}
      
    </group>
  )
}

/**
 * This component renders the scene which renders all the components declared above and more:
 * - the moving landscape
 * - the lights
 * - the effect
 * - a black background color
 * - a black fog towards the back of the scene to hide the second terrain showing up every now and then when it appears
 * - orbit controls to play with (it helps a lot during development to drag, rotate objects in the scene)
 * - the perspective camera (our default camera thanks to the makeDefault prop)
 *
 *
 * Note:
 * I used this useEffect / isMounted trick to make sure Next.js doesn't make the scene
 * crash due to the lack of "window". Not the best, but it works. At least we have access to the
 * device pixel ratio immediately when the scene appears the first time.
 *
 */
const Scene = (props) => {
  const { edit, selected } = props;
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <>
      {!mounted ? null : (<div>
        {/* <Image className="hero-img" src="/full-logo.png" alt="titanicsend" width="2000" height="1500" layout="raw" /> */}
        {/* <img className="hero-img" src="/te-web/full-logo.png" alt="titanicsend" /> */}
        {!!!edit && <img className="hero-img" src="https://ctoscano.github.io/te-web/full-logo.png" alt="titanicsend" />}
        {/* <h1 className="hero-title">Titanic's End</h1> */}
        <Canvas
          style={{
            position: "absolute",
            display: "block",
            top: 0,
            left: 0,
            zIndex: -1,
            outline: "none",
          }}
          dpr={Math.min(window.devicePixelRatio, 2)}
          linear
          antialias
        >
          <React.Suspense fallback={null}>
            <color attach="background" args={["#000000"]} />
            <fog attach="fog" args={["#000000", 1, 2.5]} />
            {!!edit && <OrbitControls attach="orbitControls" />}
            <PerspectiveCamera
              makeDefault
              position={[0, 0.06, 1.1]}
              fov={75}
              near={0.01}
              far={20}
            />
            {!!!edit && <Sun />}
            {!!edit && <Panels selected={selected} />}
            {!!!edit && <Light />}
            {!!!edit && <Landscape />}
            {!!!edit && <Effects />}
          </React.Suspense>
        </Canvas>
      </div>)}
    </>
  );
};

const Controls = (props) => {
  const { selected, setSelected } = props;

  const updateColor = (id, value) => {
    setSelected({...selected, colors: { ...selected.colors, [id]: value } });
  };
  
  return (
  <div style={{color: "white"}}>
    <input type="button" onClick={() => setSelected({ colors: selected.colors })} value="Clear" />
    {teModel.panels.map((panel, i) => {
      return (<label key={i}>
        <input type="checkbox" checked={!!selected[panel.id]} onClick={() => setSelected({...selected, [panel.id]: !selected[panel.id]})} />{panel.id}</label>);
    })}
    <div>
      Primary Color: <input value={selected.colors["primary"]} onChange={(e) => updateColor("primary", e.currentTarget.value)} />
      Edge Color: <input value={selected.colors["edge"]} onChange={(e) => updateColor("edge", e.currentTarget.value)} />
      <span>(ex. &quot;#e84971&quot; or &quot;rgb(30%, 50%, 8%)&quot; or &quot;rgb(255, 50, 80)&quot;)</span>
    </div>
  </div>);
}

export default function Home() {
  const [edit, setEdit] = React.useState(false);
  const [selected, setSelected] = React.useState({ colors: { primary: "#e84971", edge: "#39f5e6"} });
  return (
    <div>
      <Head>
        <title>Titanic&apos;s End Lighting Studio</title>
        <meta
          name="description"
          content="A reversed-engineer versioned of the WebGL animation from the Linear 2021 release page. Recreated by @MaximeHeckel"
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main>
        {!!edit && <FPSStats />}
        <div className="label-container">
          <p className="label" style={{ cursor: "pointer" }} onClick={() => setEdit(!!!edit)}>
            Edit
          </p>
          {edit && <Controls selected={selected} setSelected={setSelected} />}
          {/* <p className="label">
            ✨ Reverse-engineered and recreated by{" "}
            <a href="https://twitter.com/MaximeHeckel">@MaximeHeckel</a> with
            React-Three-Fiber
          </p>
          <p className="label">
            👉 How I built this?{" "}
            <a href="https://blog.maximeheckel.com/posts/vaporwave-3d-scene-with-threejs/">
              Building a Vaporwave scene with Three.js
            </a>{" "}
            (Three.js only)
          </p> */}
        </div>
        <Scene edit={edit} selected={selected} />
      </main>
    </div>
  );
}
