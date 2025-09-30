import React, { useState } from 'react';
import { View, TextInput, Button, Alert, StyleSheet, SafeAreaView, Text } from 'react-native';
import { supabase } from '../src/supabaseClient';
import { useRouter } from 'expo-router';

export default function Cadastro() {
  const router = useRouter();
  const [posto, setPosto] = useState('');
  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSignup() {
    if (!posto.trim() || !nome.trim() || !cpf.trim() || !email.trim() || !senha.trim()) {
      Alert.alert('Erro', 'Por favor, preencha todos os campos.');
      return;
    }

    setLoading(true);

    try {
      // Armazena temporariamente os dados extras no localStorage
      localStorage.setItem('cadastroExtras', JSON.stringify({ posto, nome, cpf, email }));

      // Cria o usuário e envia link de confirmação
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password: senha,
        options: {
          emailRedirectTo: "http://localhost:5173", // root do app
        },
      });

      if (signUpError) {
        Alert.alert('Erro no cadastro', signUpError.message);
        setLoading(false);
        return;
      }

      setLoading(false);
      Alert.alert('Cadastro realizado!', 'Confira seu e-mail para ativar a conta.');
      router.replace('/');

    } catch (err) {
      setLoading(false);
      Alert.alert('Erro inesperado', err.message || 'Tente novamente.');
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Cadastro</Text>
      <TextInput
        placeholder="Posto/Graduação"
        style={styles.input}
        value={posto}
        onChangeText={setPosto}
        autoCapitalize="words"
      />
      <TextInput
        placeholder="Nome completo"
        style={styles.input}
        value={nome}
        onChangeText={setNome}
        autoCapitalize="words"
      />
      <TextInput
        placeholder="CPF (somente números)"
        style={styles.input}
        value={cpf}
        onChangeText={setCpf}
        keyboardType="number-pad"
        maxLength={11}
      />
      <TextInput
        placeholder="Email"
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        placeholder="Senha"
        style={styles.input}
        value={senha}
        onChangeText={setSenha}
        secureTextEntry
      />
      <Button 
        title={loading ? 'Cadastrando...' : 'Cadastrar'} 
        onPress={handleSignup} 
        disabled={loading} 
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center' },
  title: { fontSize: 24, marginBottom: 20, textAlign: 'center', fontWeight: 'bold' },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    marginBottom: 15,
    borderRadius: 5,
    paddingHorizontal: 10,
    height: 40,
  },
});
