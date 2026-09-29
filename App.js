// App.js
import React, { useEffect, useState } from "react";
import {
  StatusBar,
  View,
  StyleSheet,
} from "react-native";

import {
  NavigationContainer,
  DefaultTheme,
} from "@react-navigation/native";

import { createStackNavigator } from "@react-navigation/stack";
import { initDB, getUserLocal } from "./src/storage/db";

import LoginScreen from "./src/screens/LoginScreen";
import SelectOperationScreen from "./src/screens/SelectOperationScreen";
import HomeScreen from "./src/screens/HomeScreen";
import TargetOptionsScreen from "./src/screens/TargetOptionsScreen";
import FichaAlvoScreen from "./src/screens/FichaAlvo";
import CumprimentoMandadoScreen from "./src/screens/CumprimentoMandado";
import AutoCircunstanciadoScreen from "./src/screens/AutoCircunstanciadoScreen";
import EncerrarOperacaoScreen from "./src/screens/EncerrarOperacaoScreen";
import FormularioCelularScreen from "./src/screens/FormularioCelularScreen";
import OperacaoEncerradaScreen from "./src/screens/OperacaoEncerradaScreen";
import MateriaisApreendidosScreen from "./src/screens/MateriaisApreendidosScreen";
import CadastroTestemunhaScreen from "./src/screens/CadastroTestemunhaScreen";

const Stack = createStackNavigator();

const OPERSAITheme = {
  ...DefaultTheme,
  dark: false,
  colors: {
    ...DefaultTheme.colors,
    primary: "#007AFF",
    background: "#FFFFFF",
    card: "#FFFFFF",
    text: "#000000",
    border: "#D3D3D3",
    notification: "#007AFF",
  },
};

export default function App() {
  const [initialRoute, setInitialRoute] = useState("Login");

  useEffect(() => {
    initDB();

    getUserLocal(user => {
      if (user) {
        setInitialRoute("SelectOperation");
      }
    });
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#FFFFFF"
      />

      <NavigationContainer theme={OPERSAITheme}>
        <Stack.Navigator
          initialRouteName={initialRoute}
          screenOptions={{ headerShown: false }}
        >
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="SelectOperation" component={SelectOperationScreen} />
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="TargetOptions" component={TargetOptionsScreen} />
          <Stack.Screen name="FichaAlvo" component={FichaAlvoScreen} />
          <Stack.Screen name="Mandado" component={CumprimentoMandadoScreen} />
          <Stack.Screen name="AutoCircunstanciadoScreen" component={AutoCircunstanciadoScreen} />
          <Stack.Screen name="EncerrarOperacaoScreen" component={EncerrarOperacaoScreen} />
          <Stack.Screen name="FormularioCelularScreen" component={FormularioCelularScreen} />
          <Stack.Screen name="OperacaoEncerradaScreen" component={OperacaoEncerradaScreen} />
          <Stack.Screen name="MateriaisApreendidosScreen" component={MateriaisApreendidosScreen} />
          <Stack.Screen name="CadastroTestemunhaScreen" component={CadastroTestemunhaScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
});
